import requests
import json
import os

# URL of the aggregated OpenAPI spec from the API Gateway
OPENAPI_URL = "https://gts-api.slpro.in/v3/api-docs"
OUTPUT_FILE = "gt_store_openapi.json"

def fetch_and_save():
    """
    Fetches the aggregated OpenAPI JSON from the GT Store API Gateway
    and saves it to a file. This file can be imported directly into
    Postman to create a comprehensive API Collection.
    """
    print(f"Fetching aggregated API documentation from {OPENAPI_URL}...")
    try:
        # Note: If security is enabled on the v3/api-docs endpoint, you might need 
        # to provide an Authorization header here.
        response = requests.get(OPENAPI_URL, timeout=30)
        response.raise_for_status()
        
        openapi_data = response.json()
        
        # Ensure directory exists if needed (saving to root for now)
        with open(OUTPUT_FILE, "w", encoding='utf-8') as f:
            json.dump(openapi_data, f, indent=4)
        
        print(f"\n[SUCCESS] API specification saved to: {os.path.abspath(OUTPUT_FILE)}")
        print("\n--- Postman Integration Steps ---")
        print("1. Open Postman (Desktop or Web).")
        print("2. Click the 'Import' button (top left).")
        print(f"3. Upload the generated file: {OUTPUT_FILE}")
        print("4. Select 'Import as: API' or 'Import as: Collection'.")
        print("5. Postman will automatically populate all endpoints, parameters, and schemas.")
        print("----------------------------------")
        
    except requests.exceptions.RequestException as e:
        print(f"\n[ERROR] Failed to fetch documentation: {e}")
        print("Ensure the API Gateway is running and accessible.")

if __name__ == "__main__":
    fetch_and_save()
