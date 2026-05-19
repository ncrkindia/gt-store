import requests
import json
import sys

GATEWAY_URL = "http://localhost:4003"
USER_SERVICE_URL = "http://localhost:4004"

def run_test():
    print("--- STEP 1: Creating a Customer Support Ticket with an Attachment via API Gateway ---")
    support_payload = {
        "name": "Jane Support Test",
        "email": "jane.support@example.com",
        "mobile": "9876543210",
        "subject": "Faulty Device Screen",
        "message": "My device screen has colored lines. See the attached image.",
        "attachmentUrl": "/api/media/files/test_customer_attachment.png"
    }
    
    headers = {
        "Content-Type": "application/json"
    }
    
    res = requests.post(f"{GATEWAY_URL}/api/users/support", json=support_payload, headers=headers)
    if res.status_code != 200:
        print(f"FAILED: Initial ticket creation endpoint returned status {res.status_code}")
        print(res.text)
        sys.exit(1)
        
    response_data = res.json()
    ticket_number = response_data.get("ticketNumber")
    print(f"SUCCESS: Support ticket created successfully. Ticket Number: {ticket_number}")
    
    print("\n--- STEP 2: Retrieving All Support Tickets via Admin Console Endpoint (Direct Backend) ---")
    admin_headers = {
        "X-User-Email": "admin@gtstore.com",
        "X-User-Name": "System Administrator",
        "Content-Type": "application/json"
    }
    
    res = requests.get(f"{USER_SERVICE_URL}/api/users/admin/support/tickets", headers=admin_headers)
    if res.status_code != 200:
        print(f"FAILED: Admin list endpoint returned status {res.status_code}")
        print(res.text)
        sys.exit(1)
        
    tickets = res.json()
    matching_ticket = None
    for ticket in tickets:
        if ticket.get("ticketNumber") == ticket_number:
            matching_ticket = ticket
            break
            
    if not matching_ticket:
        print(f"FAILED: Created ticket {ticket_number} not found in admin support ticket list")
        sys.exit(1)
        
    print(f"SUCCESS: Ticket found in admin panel list.")
    print(f"Attachment URL: {matching_ticket.get('attachmentUrl')}")
    if matching_ticket.get("attachmentUrl") != "/api/media/files/test_customer_attachment.png":
        print(f"FAILED: attachmentUrl mismatch! Expected '/api/media/files/test_customer_attachment.png' but got '{matching_ticket.get('attachmentUrl')}'")
        sys.exit(1)
    print("SUCCESS: Customer attachment URL verified perfectly!")
    
    ticket_id = matching_ticket.get("id")
    
    print("\n--- STEP 3: Admin publishing Reply with an Image Attachment ---")
    reply_payload = {
        "message": "Thank you for reaching out. We have authorized a replacement. Refer to this confirmation label.",
        "isInternal": False,
        "sendEmail": False,
        "attachmentUrl": "/api/media/files/admin_replacement_confirmation.png"
    }
    
    res = requests.post(f"{USER_SERVICE_URL}/api/users/admin/support/tickets/{ticket_id}/messages", json=reply_payload, headers=admin_headers)
    if res.status_code != 200:
        print(f"FAILED: Admin reply creation returned status {res.status_code}")
        print(res.text)
        sys.exit(1)
        
    print("SUCCESS: Admin reply with image attachment successfully published!")
    
    print("\n--- STEP 4: Fetching Ticket Details to Verify Message Attachment URL ---")
    res = requests.get(f"{USER_SERVICE_URL}/api/users/admin/support/tickets/{ticket_id}", headers=admin_headers)
    if res.status_code != 200:
        print(f"FAILED: Admin ticket details returned status {res.status_code}")
        print(res.text)
        sys.exit(1)
        
    ticket_details = res.json()
    messages = ticket_details.get("messages", [])
    
    admin_msg = None
    for msg in messages:
        if msg.get("sender") == "admin@gtstore.com":
            admin_msg = msg
            break
            
    if not admin_msg:
        print("FAILED: Admin message reply not found in ticket details message thread")
        sys.exit(1)
        
    print("SUCCESS: Admin message reply found in thread!")
    print(f"Message Attachment URL: {admin_msg.get('attachmentUrl')}")
    if admin_msg.get("attachmentUrl") != "/api/media/files/admin_replacement_confirmation.png":
        print(f"FAILED: message attachmentUrl mismatch! Expected '/api/media/files/admin_replacement_confirmation.png' but got '{admin_msg.get('attachmentUrl')}'")
        sys.exit(1)
        
    print("\n=======================================================")
    print(" ALL TESTS PASSED SUCCESSFULLY! SUPPORT TICKET ATTACHMENT FLOW IS ROBUST!")
    print("=======================================================")

if __name__ == "__main__":
    run_test()
