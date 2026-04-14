import pandas as pd
import os
from services.db import run_sql
import re
import google.genai as genai
from dotenv import load_dotenv

load_dotenv()

# 🔥 GEMINI CONFIG
GEMINI_API_KEY = "AIzaSyCqueMjXyg_wTw_5LOHyT4Q0aaOUXNmOSU"
if not GEMINI_API_KEY:
    raise ValueError("❌ GEMINI_API_KEY not set. Add it to your .env file")

client = genai.Client(api_key=GEMINI_API_KEY)

def call_llm(prompt):
    response = client.models.generate_content(
        model="gemini-2.5-flash",
        contents=prompt
    )
    return response.text.strip()

# 🔥 PRODUCTION SQL PROMPT
def generate_sql(question):
    prompt = f'''
    You are a senior financial data analyst.

    Database tables:
    sales(clientname, netsales, shdate, country)
    expenses(category, amount, date)

    Rules:
    - Always return ONLY valid MySQL SQL, no markdown, no ``` markers
    - Use SUM, GROUP BY when needed
    - Handle date filtering (monthly/yearly)
    - Return ONLY the SQL query on a single or multiple lines, no explanations, no code blocks
    - Ensure the query is executable and returns results

    Question:
    {question}
    '''
    return call_llm(prompt)

# 🔥 FINANCIAL INSIGHTS
def generate_insight(question, df):
    prompt = f'''
    You are a CFO-level financial analyst. Analyze this data and provide insights.

    Question:
    {question}

    Data Summary:
    {df.describe().to_string()}

    Data Sample:
    {df.head(10).to_string()}

    Provide a clear, professional insight that includes:
    1. Direct answer to the question
    2. Key findings from the data
    3. Business implications or recommendations
    
    Format it clearly and concisely (2-3 sentences).
    '''
    return call_llm(prompt)

# 🔥 MAIN AGENT FUNCTION
def clean_sql(sql):
    """Remove markdown code blocks from SQL query"""
    sql = sql.strip()
    
    # Split into lines and filter out lines that are just backticks
    lines = sql.split('\n')
    cleaned_lines = []
    
    for line in lines:
        stripped = line.strip()
        # Skip lines that are just backticks (with optional 'sql' or 'SQL')
        if stripped and not re.match(r'^`{3}(sql|SQL)?$', stripped):
            cleaned_lines.append(line)
    
    sql = '\n'.join(cleaned_lines).strip()
    return sql

def agent(question):
    """Main agent that processes questions and returns insights with data"""
    try:
        # Generate SQL from question
        sql = generate_sql(question)
        sql = clean_sql(sql)
        
        # Execute SQL
        df = run_sql(sql)
        
        if df.empty:
            return {
                "insight": "❌ No data found for your query",
                "sql": sql,
                "table": None
            }
        
        # Generate insight
        insight = generate_insight(question, df)
        
        return {
            "insight": f"💡 Insight: {insight}",
            "sql": sql,
            "table": df.head(10).to_dict(orient="records")
        }
    except Exception as e:
        return {
            "insight": f"❌ Error processing your request: {str(e)}",
            "sql": None,
            "table": None
        }

# 🔥 FORMAT DATA TABLE
def format_data_table(df):
    """Convert dataframe to HTML table with styling"""
    if df.empty:
        return "<p style='color: #999;'>No data available</p>"
    
    html = '<table class="data-table">'
    html += '<thead><tr>'
    for col in df.columns:
        html += f'<th>{col}</th>'
    html += '</tr></thead><tbody>'
    
    for idx, row in df.head(10).iterrows():
        html += '<tr>'
        for val in row:
            html += f'<td>{val}</td>'
        html += '</tr>'
    
    html += '</tbody></table>'
    
    if len(df) > 10:
        html += f'<p style="color: #666; font-size: 12px;">Showing 10 of {len(df)} rows</p>'
    
    return html

# 🔥 AGENT ORCHESTRATOR
def agent(question):
    try:
        sql = generate_sql(question)
        df = run_sql(sql)

        if df.empty:
            return {
                "insight": "⚠️ No data found for this query. Please try a different question.",
                "table": None,
                "sql": sql
            }

        insight = generate_insight(question, df)
        table_html = format_data_table(df)

        return {
            "insight": insight,
            "table": table_html,
            "sql": sql
        }
    except Exception as e:
        return {
            "insight": f"❌ Error processing your request: {str(e)}",
            "table": None,
            "sql": None
        }

