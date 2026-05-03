

from flask import Blueprint, current_app, request, jsonify
from flask_login import (
    login_user,
    logout_user,
    login_required,
    current_user
)
from werkzeug.security import (
    generate_password_hash,
    check_password_hash
)
from email_validator import validate_email, EmailNotValidError
from itsdangerous import URLSafeTimedSerializer
from models import db, Admin, Opportunity

api = Blueprint("api", __name__)

ALLOWED_CATEGORIES = {
    "technology": "Technology",
    "business": "Business",
    "design": "Design",
    "marketing": "Marketing",
    "data": "Data Science",
    "data science": "Data Science",
    "other": "Other",
}


def serializer(secret):
    return URLSafeTimedSerializer(secret)


def get_json_data():
    return request.get_json(silent=True) or {}


def normalize_category(category):
    key = str(category or "").strip().lower()
    return ALLOWED_CATEGORIES.get(key)


def normalize_max_applicants(value):
    if value in (None, ""):
        return None

    try:
        applicants = int(value)
    except (TypeError, ValueError):
        return None

    return applicants if applicants >= 0 else None


def validate_opportunity_payload(data):
    required = [
        "opportunity_name",
        "duration",
        "start_date",
        "description",
        "skills_to_gain",
        "category",
        "future_opportunities",
    ]

    cleaned = {}

    for field in required:
        value = str(data.get(field, "")).strip()
        if not value:
            return None, f"{field} is required"
        cleaned[field] = value

    category = normalize_category(cleaned["category"])
    if not category:
        return None, "Invalid category"

    cleaned["category"] = category
    cleaned["maximum_applicants"] = normalize_max_applicants(
        data.get("maximum_applicants")
    )

    return cleaned, None


# ---------------- SIGNUP ----------------
@api.route("/signup", methods=["POST"])
def signup():
    data = get_json_data()

    full_name = data.get("full_name", "").strip()
    email = data.get("email", "").strip()
    password = data.get("password", "")
    confirm_password = data.get("confirm_password", "")

    if not all([full_name, email, password, confirm_password]):
        return jsonify({"error": "All fields are required"}), 400

    try:
        validate_email(email, check_deliverability=False)
    except EmailNotValidError:
        return jsonify({"error": "Invalid email format"}), 400

    if len(password) < 8:
        return jsonify({
            "error": "Password must be at least 8 characters"
        }), 400

    if password != confirm_password:
        return jsonify({
            "error": "Passwords do not match"
        }), 400

    existing = Admin.query.filter_by(email=email).first()
    if existing:
        return jsonify({
            "error": "Account already exists"
        }), 400

    new_admin = Admin(
        full_name=full_name,
        email=email,
        password_hash=generate_password_hash(password)
    )

    db.session.add(new_admin)
    db.session.commit()

    return jsonify({
        "message": "Signup successful"
    }), 201


# ---------------- LOGIN ----------------
@api.route("/login", methods=["POST"])
def login():
    data = get_json_data()

    email = data.get("email", "").strip()
    password = data.get("password", "")
    remember = data.get("remember", False)

    user = Admin.query.filter_by(email=email).first()

    if not user or not check_password_hash(
        user.password_hash,
        password
    ):
        return jsonify({
            "error": "Invalid email or password"
        }), 401

    login_user(user, remember=remember)

    return jsonify({
        "message": "Login successful",
        "admin": {
            "id": user.id,
            "name": user.full_name,
            "email": user.email
        }
    })


# ---------------- CURRENT USER ----------------
@api.route("/me", methods=["GET"])
@login_required
def me():
    return jsonify({
        "admin": {
            "id": current_user.id,
            "name": current_user.full_name,
            "email": current_user.email
        }
    })


# ---------------- LOGOUT ----------------
@api.route("/logout", methods=["GET"])
@login_required
def logout():
    logout_user()
    return jsonify({
        "message": "Logged out successfully"
    })


# ---------------- FORGOT PASSWORD ----------------
@api.route("/forgot-password", methods=["POST"])
def forgot_password():
    data = get_json_data()
    email = data.get("email", "").strip()

    user = Admin.query.filter_by(email=email).first()

    if user:
        token = serializer(
            current_app.config["SECRET_KEY"]
        ).dumps(email)

        reset_link = (
            f"http://localhost:5000/reset-password/{token}"
        )

        print("RESET LINK:", reset_link)

    return jsonify({
        "message":
        "If the email exists, a password reset link has been generated."
    })


# ---------------- RESET PASSWORD ----------------
@api.route("/reset-password/<token>", methods=["POST"])
def reset_password(token):
    data = get_json_data()
    new_password = data.get("password", "")

    if len(new_password) < 8:
        return jsonify({
            "error":
            "Password must be at least 8 characters"
        }), 400

    try:
        email = serializer(
            current_app.config["SECRET_KEY"]
        ).loads(
            token,
            max_age=3600
        )

    except Exception:
        return jsonify({
            "error":
            "Reset link expired or invalid"
        }), 400

    user = Admin.query.filter_by(email=email).first()

    if user:
        user.password_hash = generate_password_hash(
            new_password
        )
        db.session.commit()

    return jsonify({
        "message":
        "Password reset successful"
    })


# ---------------- GET ALL ----------------
@api.route("/opportunities", methods=["GET"])
@login_required
def get_opportunities():
    ops = Opportunity.query.filter_by(
        admin_id=current_user.id
    ).order_by(
        Opportunity.created_at.desc()
    ).all()

    return jsonify([
        op.to_dict() for op in ops
    ])


# ---------------- ADD ----------------
@api.route("/opportunities", methods=["POST"])
@login_required
def add_opportunity():
    data = get_json_data()

    cleaned, error = validate_opportunity_payload(data)

    if error:
        return jsonify({
            "error": error
        }), 400

    op = Opportunity(
        opportunity_name=cleaned["opportunity_name"],
        duration=cleaned["duration"],
        start_date=cleaned["start_date"],
        description=cleaned["description"],
        skills_to_gain=cleaned["skills_to_gain"],
        category=cleaned["category"],
        future_opportunities=cleaned["future_opportunities"],
        maximum_applicants=cleaned["maximum_applicants"],
        admin_id=current_user.id
    )

    db.session.add(op)
    db.session.commit()

    return jsonify(op.to_dict()), 201


# ---------------- GET ONE ----------------
@api.route("/opportunities/<int:id>", methods=["GET"])
@login_required
def get_one(id):
    op = Opportunity.query.filter_by(
        id=id,
        admin_id=current_user.id
    ).first()

    if not op:
        return jsonify({
            "error": "Not found"
        }), 404

    return jsonify(op.to_dict())


# ---------------- UPDATE ----------------
@api.route("/opportunities/<int:id>", methods=["PUT"])
@login_required
def update_opportunity(id):
    op = Opportunity.query.filter_by(
        id=id,
        admin_id=current_user.id
    ).first()

    if not op:
        return jsonify({
            "error": "Not found"
        }), 404

    data = get_json_data()

    cleaned, error = validate_opportunity_payload(data)

    if error:
        return jsonify({
            "error": error
        }), 400

    for key, value in cleaned.items():
        setattr(op, key, value)

    db.session.commit()

    return jsonify({
        "message": "Updated successfully",
        "data": op.to_dict()
    })


# ---------------- DELETE ----------------
@api.route("/opportunities/<int:id>", methods=["DELETE"])
@login_required
def delete_opportunity(id):
    op = Opportunity.query.filter_by(
        id=id,
        admin_id=current_user.id
    ).first()

    if not op:
        return jsonify({
            "error": "Not found"
        }), 404

    db.session.delete(op)
    db.session.commit()

    return jsonify({
        "message": "Deleted successfully"
    })