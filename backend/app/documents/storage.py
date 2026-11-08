"""Private Object Storage Vault for confidential client documents (S3 + Private Local Vault)."""

from __future__ import annotations

import hashlib
import os
import uuid
from pathlib import Path
from typing import Tuple

from app.core.config import settings
from app.core.exceptions import DocumentValidationError
from app.core.logging import logger

try:
    import boto3  # type: ignore
except Exception:  # pragma: no cover
    boto3 = None  # type: ignore


class PrivateDocumentStorage:
    """Manage confidential document binaries outside PostgreSQL and public web roots."""

    def __init__(self) -> None:
        self.vault_root = Path(settings.PRIVATE_STORAGE_DIR).resolve()
        self.vault_root.mkdir(parents=True, exist_ok=True)
        try:
            os.chmod(self.vault_root, 0o700)
        except Exception:
            pass

        self._s3_client = None
        if (
            settings.STORAGE_ENDPOINT
            and settings.STORAGE_ACCESS_KEY
            and settings.STORAGE_SECRET_KEY
            and boto3 is not None
        ):
            try:
                self._s3_client = boto3.client(
                    "s3",
                    endpoint_url=settings.STORAGE_ENDPOINT,
                    aws_access_key_id=settings.STORAGE_ACCESS_KEY,
                    aws_secret_access_key=settings.STORAGE_SECRET_KEY,
                    region_name=settings.STORAGE_REGION,
                )
            except Exception as exc:
                logger.warning(f"S3 client initialization fell back to local vault: {exc}")

    def _resolve_safe_local_path(self, storage_key: str) -> Path:
        """Prevent path traversal by verifying resolved path remains inside vault_root."""
        clean_rel = storage_key.lstrip("/\\")
        target = (self.vault_root / clean_rel).resolve()
        if not str(target).startswith(str(self.vault_root)):
            raise DocumentValidationError("Invalid storage key path", status_code=400)
        return target

    def save_document(
        self, *, user_id: uuid.UUID, file_bytes: bytes, extension: str
    ) -> Tuple[str, str]:
        """Store file bytes in private storage and return (storage_key, sha256_hash)."""
        sha256_hash = hashlib.sha256(file_bytes).hexdigest()
        doc_uuid = uuid.uuid4()
        ext_clean = extension.lower().lstrip(".")
        storage_key = f"users/{user_id}/{doc_uuid}_{sha256_hash}.{ext_clean}"

        if self._s3_client is not None:
            self._s3_client.put_object(
                Bucket=settings.STORAGE_BUCKET,
                Key=storage_key,
                Body=file_bytes,
                ServerSideEncryption="AES256",
            )
            return storage_key, sha256_hash

        local_path = self._resolve_safe_local_path(storage_key)
        local_path.parent.mkdir(parents=True, exist_ok=True)
        local_path.write_bytes(file_bytes)
        try:
            os.chmod(local_path, 0o600)
        except Exception:
            pass
        return storage_key, sha256_hash

    def read_document(self, storage_key: str) -> bytes:
        """Read raw bytes from private storage by storage_key."""
        if self._s3_client is not None:
            resp = self._s3_client.get_object(Bucket=settings.STORAGE_BUCKET, Key=storage_key)
            return bytes(resp["Body"].read())

        local_path = self._resolve_safe_local_path(storage_key)
        if not local_path.exists():
            raise DocumentValidationError("Stored document binary not found", status_code=404)
        return local_path.read_bytes()

    def delete_document(self, storage_key: str) -> None:
        """Permanently purge a document binary from private storage (DPDP right to erasure)."""
        if self._s3_client is not None:
            try:
                self._s3_client.delete_object(Bucket=settings.STORAGE_BUCKET, Key=storage_key)
            except Exception as exc:
                logger.warning(f"S3 delete warning: {exc}")
            return

        try:
            local_path = self._resolve_safe_local_path(storage_key)
            if local_path.exists():
                local_path.unlink()
        except Exception as exc:
            logger.warning(f"Local vault delete warning: {exc}")


document_storage = PrivateDocumentStorage()
