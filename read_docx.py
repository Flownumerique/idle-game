import zipfile
import xml.etree.ElementTree as ET
import sys
import glob

def read_docx(path):
    output = f"--- Document: {path} ---\n"
    try:
        with zipfile.ZipFile(path) as docx:
            tree = ET.XML(docx.read('word/document.xml'))
            namespaces = {'w': 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'}
            text = []
            for paragraph in tree.iterfind('.//w:p', namespaces):
                texts = [node.text for node in paragraph.iterfind('.//w:t', namespaces) if node.text]
                if texts:
                    text.append(''.join(texts))
            output += '\n'.join(text)
    except Exception as e:
        output += f"Error reading {path}: {e}"
    return output

if __name__ == '__main__':
    with open('project_overview_raw.txt', 'w', encoding='utf-8') as f:
        for file in glob.glob('*.docx'):
            f.write(read_docx(file) + '\n\n' + '='*50 + '\n\n')
