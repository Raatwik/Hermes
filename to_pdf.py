from fpdf import FPDF

pdf = FPDF()
pdf.add_page()
pdf.set_font("Arial", size=11)

with open('DESC.txt', 'r', encoding='utf-8') as f:
    for line in f:
        # Convert some unsupported unicode characters if any (like bullets)
        # fpdf default font (latin-1) doesn't support the bullet point symbol '•'
        # We will replace it with an asterisk or just write it using encode/decode
        text = line.strip().replace('•', '*')
        # encode to latin-1 and ignore errors to prevent crashes
        text = text.encode('latin-1', 'replace').decode('latin-1')
        
        pdf.multi_cell(0, 5, txt=text)

pdf.output("DESC.pdf")
print("PDF created successfully at DESC.pdf")
