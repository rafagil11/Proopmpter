import os
from dotenv import load_dotenv
from opik import Opik

load_dotenv()

def cleanup_old_datasets():
    """Clean up old promptpilot datasets to prevent accumulation"""
    opik_client = Opik()
    
    try:
        print("Note: Opik doesn't provide a direct API to list all datasets.")
        print("To clean up old datasets, you can:")
        print("1. Go to your Opik dashboard at https://www.comet.com/opik/")
        print("2. Navigate to the Datasets section")
        print("3. Look for datasets starting with 'promptpilot_eval_'")
        print("4. Delete them manually from the dashboard")
        print("\nAlternatively, you can delete a specific dataset by Name if you know it:")
        
        dataset_id = input("Enter dataset ID to delete (or press Enter to skip): ").strip()
        
        if dataset_id:
            try:
                opik_client.delete_dataset(dataset_id)
                print(f"Successfully deleted dataset with Name: {dataset_id}")
            except Exception as e:
                print(f"Failed to delete dataset: {e}")
        else:
            print("No dataset name provided. Skipping deletion.")
        
    except Exception as e:
        print(f"Error during cleanup: {e}")

if __name__ == '__main__':
    cleanup_old_datasets() 