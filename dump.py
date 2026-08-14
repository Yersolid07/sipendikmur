import pandas as pd

df = pd.read_excel('DOC-20260724-WA0038.xlsx', sheet_name=None)
with open('excel_dump.md', 'w') as f:
    for sheet_name, sheet_df in df.items():
        f.write(f'# Sheet: {sheet_name}\n')
        f.write(sheet_df.head(30).to_markdown())
        f.write('\n\n')
