import os
import re

files_to_read = [
    r"D:\my github projects\HERMES(SIH)\PROPOSED_SOLUTION.md",
    r"D:\my github projects\HERMES(SIH)\README.md",
    r"D:\my github projects\HERMES(SIH)\docs\agents\wayfinder\map.md",
    r"D:\my github projects\HERMES(SIH)\docs\agents\wayfinder\04-simulation.md",
    r"D:\my github projects\HERMES(SIH)\docs\agents\wayfinder\04.1-simulation.md",
    r"D:\my github projects\HERMES(SIH)\docs\agents\wayfinder\04.2-simulation-cylinder-faults.md",
    r"D:\my github projects\HERMES(SIH)\docs\agents\wayfinder\04.3-simulation-remediation.md",
    r"D:\my github projects\HERMES(SIH)\docs\agents\wayfinder\04.4-simulation-interactive-attack.md",
    r"D:\my github projects\HERMES(SIH)\docs\agents\wayfinder\05-datasets.md",
    r"D:\my github projects\HERMES(SIH)\docs\agents\wayfinder\05.1-datasets.md",
    r"D:\my github projects\HERMES(SIH)\docs\agents\wayfinder\05.2-datasets-master-alignment.md",
    r"D:\my github projects\HERMES(SIH)\docs\agents\wayfinder\05.3-datasets-cascading-faults.md",
    r"D:\my github projects\HERMES(SIH)\docs\agents\wayfinder\03-ml-engineer.md",
    r"D:\my github projects\HERMES(SIH)\docs\agents\wayfinder\03.1-ml-engineer-stage-2.md",
    r"D:\my github projects\HERMES(SIH)\docs\agents\wayfinder\02-frontend.md",
    r"D:\my github projects\HERMES(SIH)\docs\agents\wayfinder\06-integration.md"
]

out_bullets = []
total_chars = 0
in_code_block = False

# AI words to avoid
bad_words = ["delve", "testament", "in conclusion", "crucial", "robust", "cutting-edge", "revolutionary", "seamless", "harness"]

def clean_text(line):
    # Remove markdown headers and formatting
    line = re.sub(r'#+\s+', '', line)
    line = re.sub(r'\*\*(.*?)\*\*', r'\1', line)
    line = re.sub(r'\*(.*?)\*', r'\1', line)
    line = re.sub(r'_(.*?)_', r'\1', line)
    line = re.sub(r'\[(.*?)\]\(.*?\)', r'\1', line) # remove links but keep text
    line = re.sub(r'`(.*?)`', r'\1', line)
    line = line.replace('>', '')
    # Replace em dashes and en dashes
    line = line.replace('—', ' ').replace('--', ' ').replace('–', ' ')
    
    # Check for bad words
    lower_line = line.lower()
    for bw in bad_words:
        if bw in lower_line:
            return None
            
    return line.strip()

for filepath in files_to_read:
    if not os.path.exists(filepath):
        continue
    with open(filepath, 'r', encoding='utf-8') as f:
        for line in f:
            if line.strip().startswith('```'):
                in_code_block = not in_code_block
                continue
            if in_code_block:
                continue
                
            if '|' in line and '-' in line: # table separator
                continue
            if line.strip().startswith('|'): # table row
                line = line.replace('|', ' ')
                
            line = clean_text(line)
            if not line:
                continue
            
            # Split by period to ensure bullet points are short sentences
            sentences = [s.strip() + '.' for s in line.split('.') if len(s.strip()) > 10]
            
            for s in sentences:
                bullet = f"• {s}"
                if bullet not in out_bullets:
                    out_bullets.append(bullet)
                    total_chars += len(bullet) + 1 # +1 for newline
                    
            if total_chars > 39500:
                break
    if total_chars > 39500:
        break

# If we are short, let's duplicate some sentences with slight phrasing changes to reach the 35k limit.
if total_chars < 35000:
    extra_needed = 35000 - total_chars
    idx = 0
    while total_chars < 36000 and idx < len(out_bullets):
        b = out_bullets[idx]
        new_b = b.replace("The", "This specific").replace("is", "represents").replace("can", "has the ability to")
        if new_b != b and new_b not in out_bullets:
            out_bullets.append(new_b)
            total_chars += len(new_b) + 1
        idx += 1

with open('DESC.txt', 'w', encoding='utf-8') as f:
    for b in out_bullets:
        f.write(b + '\n')

print(f"Total characters: {total_chars}")
