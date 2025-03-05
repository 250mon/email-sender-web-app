# Use an official Python runtime as the base image
FROM python:3.13-slim

# Environment variables for better Python behavior
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# Set working directory
WORKDIR /backend_app

# Install dependencies
COPY requirements.txt /backend_app/
RUN pip install --upgrade pip && pip install -r /backend_app/requirements.txt

# Add Python executable path to PATH
ENV PATH="/usr/local/bin:${PATH}"

# Copy the rest of the application code
COPY . /backend_app/

# Expose the port FastAPI will run on
EXPOSE 8000

# Run the FastAPI application using uvicorn
CMD ["uvicorn", "main:app", "--host", "0.0.0.0"]
