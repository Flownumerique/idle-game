from docx import Document
import sys

def extract_tables(filename):
    doc = Document(filename)
    for i, table in enumerate(doc.tables):
        print(f"--- Table {i+1} ---")
        for row in table.rows:
            row_data = [cell.text.replace('\n', ' ').strip() for cell in row.cells]
            print(" | ".join(row_data))
        print("\n")

if __name__ == '__main__':
    extract_tables(sys.argv[1])
