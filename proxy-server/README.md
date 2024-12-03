# ITS Pricing API Proxy v1.0.0

A proxy server for the ITS Technology Group API that handles authentication and result polling.

## Setup

1. Install dependencies: 


npm install


2. Start the server:


node server.js


## API Endpoints

### POST /api/its/availability
Get pricing quotes for a specific address and connection speed.

#### Request Body

json
{
"postcode": "string",
"address_line_1": "string",
"town": "string",
"latitude": number,
"longitude": number,
"connections": [{
"speed": number
}]
}


#### Response
Returns pricing quotes from ITS Technology Group.

### GET /health
Health check endpoint.

## Environment Variables
- PORT: Server port (default: 3001)

## Error Handling
The server includes comprehensive error handling and logging.