import requests
import json

try:
    print("Fetching http://localhost:8000/api/data?width=1000 ...")
    r = requests.get("http://localhost:8000/api/data?width=1000")
    
    print(f"Status Code: {r.status_code}")
    
    if r.status_code == 200:
        data = r.json()
        print(f"Data type: {type(data)}")
        print(f"Length: {len(data)}")
        
        if len(data) >= 2:
            times = data[0]
            values = data[1]
            print(f"Times count: {len(times)}")
            print(f"Values count: {len(values)}")
            
            if len(times) > 0:
                print(f"First Time: {times[0]}")
                print(f"Last Time: {times[-1]}")
                print(f"First Value: {values[0]}")
            else:
                print("⚠️ Times array is EMPTY!")
        else:
            print("⚠️ Data structure is invalid (length < 2)")
            
        # Get raw text snippet
        print(f"Raw Snippet: {r.text[:200]}")
    else:
        print(f"Error: {r.text}")

except Exception as e:
    print(f"Connection Failed: {e}")
