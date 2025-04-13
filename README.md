## Development mode

Launch the frontend and backend separately using the following commands

### backend

- `.env`: Uncomment dev mode env variables
- `python main.py`

### frontend

- `npm start` will launch the web browser

## Production mode

Launch the frontend and backend together using docker

### backend

- `.env`: Comment dev mode env variables out

### Run

- docker compose up --build
