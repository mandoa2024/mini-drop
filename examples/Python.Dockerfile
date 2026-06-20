FROM python:3.12-slim
WORKDIR /app
COPY examples/python_hotspot.py .
CMD ["sh", "-c", "echo $$ > /runtime/python-workload.pid; exec python -u python_hotspot.py"]
