"""Add legal_judgments table for Bharat Courts cached judgments.

Revision ID: 0002_add_legal_judgments
Revises: 0001_initial_schema
Create Date: 2026-11-08 12:40:00.000000
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from app.database.base import PortableVector

revision: str = "0002_add_legal_judgments"
down_revision: Union[str, None] = "0001_initial_schema"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    dialect = bind.dialect.name

    op.create_table(
        "legal_judgments",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("external_case_id", sa.String(length=255), nullable=False),
        sa.Column("case_title", sa.String(length=500), nullable=False),
        sa.Column("court", sa.String(length=150), nullable=False),
        sa.Column("citation", sa.String(length=150), nullable=True),
        sa.Column("decision_date", sa.Date(), nullable=True),
        sa.Column("judges", sa.JSON(), nullable=False, server_default="[]"),
        sa.Column("party_names", sa.JSON(), nullable=False, server_default="[]"),
        sa.Column("petitioner", sa.String(length=350), nullable=True),
        sa.Column("respondent", sa.String(length=350), nullable=True),
        sa.Column("cnr_number", sa.String(length=60), nullable=True),
        sa.Column("case_number", sa.String(length=150), nullable=True),
        sa.Column("disposal_nature", sa.String(length=120), nullable=True),
        sa.Column("source_provider", sa.String(length=80), nullable=False, server_default="bharat_courts"),
        sa.Column("source_type", sa.String(length=50), nullable=False, server_default="archive"),
        sa.Column("document_reference", sa.String(length=512), nullable=True),
        sa.Column("source_last_verified_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("authority_status", sa.String(length=50), nullable=False, server_default="PENDING_VERIFICATION"),
        sa.Column("authority_notes", sa.Text(), nullable=True),
        sa.Column("bench_type", sa.String(length=120), nullable=True),
        sa.Column("headnote_summary", sa.Text(), nullable=True),
        sa.Column("ratio_decidendi", sa.Text(), nullable=True),
        sa.Column("extracted_text", sa.Text(), nullable=True),
        sa.Column("embedding", PortableVector(768), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("source_provider", "external_case_id", name="uq_legal_judgments_provider_case_id"),
    )

    op.create_index("ix_legal_judgments_citation", "legal_judgments", ["citation"])
    op.create_index("ix_legal_judgments_court", "legal_judgments", ["court"])
    op.create_index("ix_legal_judgments_decision_date", "legal_judgments", ["decision_date"])
    op.create_index("ix_legal_judgments_cnr", "legal_judgments", ["cnr_number"])
    op.create_index("ix_legal_judgments_authority_status", "legal_judgments", ["authority_status"])


def downgrade() -> None:
    op.drop_index("ix_legal_judgments_authority_status", table_name="legal_judgments")
    op.drop_index("ix_legal_judgments_cnr", table_name="legal_judgments")
    op.drop_index("ix_legal_judgments_decision_date", table_name="legal_judgments")
    op.drop_index("ix_legal_judgments_court", table_name="legal_judgments")
    op.drop_index("ix_legal_judgments_citation", table_name="legal_judgments")
    op.drop_table("legal_judgments")
