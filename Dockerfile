FROM python:3.12-slim

WORKDIR /app
COPY app.py /app/app.py
COPY static /app/static
COPY docs /app/docs

ENV PORT=8000
EXPOSE 8000

CMD ["python", "app.py"]
