from fastapi import UploadFile, HTTPException
from pathlib import Path
import urllib.parse
from typing import List

def secure_filename_with_hangul(filename: str) -> str:
    """Custom secure filename function that preserves Korean characters"""
    filename_encoded = urllib.parse.quote(filename)
    filename_safe = "".join(
        c for c in filename_encoded if c.isalnum() or c in ["%", "-", "_", "."]
    )
    return filename_safe

async def save_upload_files(files: List[UploadFile], upload_folder: Path) -> List[dict]:
    """Save uploaded files and return their info"""
    uploaded_files = []
    
    for file in files:
        if file.filename:
            try:
                filename = secure_filename_with_hangul(file.filename)
                filepath = upload_folder / filename

                # Ensure unique filename
                counter = 0
                while filepath.exists():
                    counter += 1
                    name_parts = filename.rsplit(".", 1)
                    if len(name_parts) > 1:
                        filepath = (
                            upload_folder / f"{name_parts[0]}_{counter}.{name_parts[1]}"
                        )
                    else:
                        filepath = upload_folder / f"{filename}_{counter}"

                contents = await file.read()
                filepath.write_bytes(contents)

                display_name = urllib.parse.unquote(filepath.name)
                uploaded_files.append({"path": str(filepath), "name": display_name})
            except Exception as e:
                raise HTTPException(
                    status_code=500,
                    detail=f"Error saving file {file.filename}: {str(e)}"
                )

    return uploaded_files
