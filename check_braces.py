import re

with open('app/components/RecepcaoView.tsx', 'r', encoding='utf-8') as f:
    src = f.read()

lines = src.split('\n')
brace_depth = 0
paren_depth = 0

for i, line in enumerate(lines):
    line_clean = re.sub(r'//.*', '', line)
    
    in_string = False
    string_char = ''
    escaped = False
    
    for ch in line_clean:
        if in_string:
            if ch == '\\' and not escaped:
                escaped = True
                continue
            if ch == string_char and not escaped:
                in_string = False
            escaped = False
            continue
        
        if ch in '"\'`':
            in_string = True
            string_char = ch
            continue
        
        if ch == '{': brace_depth += 1
        if ch == '}': brace_depth -= 1
        if ch == '(': paren_depth += 1
        if ch == ')': paren_depth -= 1
    
    if i >= 555:
        print(f'{i+1:3d}: braces={brace_depth:2d} parens={paren_depth:2d}  {line[:70]}')
