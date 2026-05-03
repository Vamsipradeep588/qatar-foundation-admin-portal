

from flask_sqlalchemy import SQLAlchemy
from flask_login import UserMixin
from datetime import datetime

db = SQLAlchemy()


class Admin(UserMixin, db.Model):
    __tablename__ = "admins"

    id = db.Column(db.Integer, primary_key=True)

    full_name = db.Column(
        db.String(120),
        nullable=False
    )

    email = db.Column(
        db.String(120),
        unique=True,
        nullable=False,
        index=True
    )

    password_hash = db.Column(
        db.String(255),
        nullable=False
    )

    created_at = db.Column(
        db.DateTime,
        default=datetime.utcnow
    )

    opportunities = db.relationship(
        "Opportunity",
        backref="creator",
        lazy=True,
        cascade="all, delete-orphan"
    )

    def get_id(self):
        return str(self.id)


class Opportunity(db.Model):
    __tablename__ = "opportunities"

    id = db.Column(
        db.Integer,
        primary_key=True
    )

    opportunity_name = db.Column(
        db.String(200),
        nullable=False
    )

    duration = db.Column(
        db.String(100),
        nullable=False
    )

    start_date = db.Column(
        db.String(100),
        nullable=False
    )

    description = db.Column(
        db.Text,
        nullable=False
    )

    skills_to_gain = db.Column(
        db.Text,
        nullable=False
    )

    category = db.Column(
        db.String(100),
        nullable=False
    )

    future_opportunities = db.Column(
        db.Text,
        nullable=False
    )

    maximum_applicants = db.Column(
        db.Integer,
        nullable=True
    )

    admin_id = db.Column(
        db.Integer,
        db.ForeignKey("admins.id"),
        nullable=False,
        index=True
    )

    created_at = db.Column(
        db.DateTime,
        default=datetime.utcnow
    )

    def to_dict(self):
        return {
            "id": self.id,
            "opportunity_name": self.opportunity_name,
            "duration": self.duration,
            "start_date": self.start_date,
            "description": self.description,
            "skills_to_gain": self.skills_to_gain,
            "category": self.category,
            "future_opportunities": self.future_opportunities,
            "maximum_applicants": self.maximum_applicants
        }