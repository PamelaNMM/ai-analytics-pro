from flask import Flask, render_template, request, jsonify
from services.ai import agent
from services.db import run_sql
import logging
from datetime import datetime, timedelta
import numpy as np
from scipy import stats

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)

# ===== SECURITY CONFIGURATION =====
app.secret_key = 'your_secret_key'
app.config['SECRET_KEY'] = 'your_secret_key'
app.config['SECURITY_PASSWORD_SALT'] = 'your_security_password_salt'

# ===== DATABASE CONNECTION PARAMETERS =====
db_params = {
    'host': 'localhost',
    'user': 'root',
    'password': 'Realign1234!',
    'database': 'sales_db',
}

@app.route("/")
def home():
    return render_template("index.html")

@app.route("/api/dashboard-stats", methods=["GET"])
def dashboard_stats():
    """Get KPI statistics for dashboard"""
    try:
        # Total Sales
        sales_df = run_sql("SELECT SUM(netsales) as total_sales FROM sales")
        total_sales = float(sales_df['total_sales'].iloc[0]) if not sales_df.empty else 0
        
        # Total Expenses
        expenses_df = run_sql("SELECT SUM(amount) as total_expenses FROM expenses")
        total_expenses = float(expenses_df['total_expenses'].iloc[0]) if not expenses_df.empty else 0
        
        # Profit
        profit = total_sales - total_expenses
        profit_margin = (profit / total_sales * 100) if total_sales > 0 else 0
        
        # Unique Clients
        clients_df = run_sql("SELECT COUNT(DISTINCT clientname) as unique_clients FROM sales")
        unique_clients = int(clients_df['unique_clients'].iloc[0]) if not clients_df.empty else 0
        
        return jsonify({
            "total_sales": round(total_sales, 2),
            "total_expenses": round(total_expenses, 2),
            "profit": round(profit, 2),
            "profit_margin": round(profit_margin, 2),
            "unique_clients": unique_clients
        }), 200
    
    except Exception as e:
        logger.error(f"Error fetching dashboard stats: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route("/api/sales-by-country", methods=["GET"])
def sales_by_country():
    """Get sales breakdown by country"""
    try:
        df = run_sql("SELECT country, SUM(netsales) as sales FROM sales GROUP BY country ORDER BY sales DESC")
        data = {
            "labels": df['country'].tolist(),
            "values": df['sales'].astype(float).tolist()
        }
        return jsonify(data), 200
    except Exception as e:
        logger.error(f"Error fetching sales by country: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route("/api/expenses-by-category", methods=["GET"])
def expenses_by_category():
    """Get expenses breakdown by category"""
    try:
        df = run_sql("SELECT category, SUM(amount) as amount FROM expenses GROUP BY category ORDER BY amount DESC")
        data = {
            "labels": df['category'].tolist(),
            "values": df['amount'].astype(float).tolist()
        }
        return jsonify(data), 200
    except Exception as e:
        logger.error(f"Error fetching expenses by category: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route("/api/sales-trend", methods=["GET"])
def sales_trend():
    """Get monthly sales trend"""
    try:
        df = run_sql("""
            SELECT DATE_FORMAT(shdate, '%Y-%m') as month, SUM(netsales) as sales 
            FROM sales 
            GROUP BY DATE_FORMAT(shdate, '%Y-%m') 
            ORDER BY month ASC
        """)
        data = {
            "labels": df['month'].tolist(),
            "values": df['sales'].astype(float).tolist()
        }
        return jsonify(data), 200
    except Exception as e:
        logger.error(f"Error fetching sales trend: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route("/api/top-clients", methods=["GET"])
def top_clients():
    """Get top performing clients"""
    try:
        df = run_sql("""
            SELECT clientname, SUM(netsales) as sales 
            FROM sales 
            GROUP BY clientname 
            ORDER BY sales DESC 
            LIMIT 10
        """)
        data = df.to_dict('records')
        return jsonify(data), 200
    except Exception as e:
        logger.error(f"Error fetching top clients: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route("/api/sales-forecast", methods=["GET"])
def sales_forecast():
    """Generate sales forecast for next 3 months using linear regression"""
    try:
        df = run_sql("""
            SELECT DATE_FORMAT(shdate, '%Y-%m') as month, SUM(netsales) as sales 
            FROM sales 
            GROUP BY DATE_FORMAT(shdate, '%Y-%m') 
            ORDER BY month ASC
        """)
        
        if df.empty or len(df) < 3:
            return jsonify({"error": "Insufficient data for forecast"}), 400
        
        # Prepare data
        x = np.arange(len(df))
        y = df['sales'].values
        
        # Linear regression
        slope, intercept, r_value, p_value, std_err = stats.linregress(x, y)
        
        # Forecast next 3 months
        months = df['month'].tolist()
        forecast_months = []
        forecast_values = []
        forecast_high = []
        forecast_low = []
        
        # Last date
        last_date = datetime.strptime(months[-1], '%Y-%m')
        
        for i in range(1, 4):
            next_date = last_date + timedelta(days=30*i)
            forecast_months.append(next_date.strftime('%Y-%m'))
            
            forecast_x = len(df) + i - 1
            predicted_value = slope * forecast_x + intercept
            forecast_values.append(max(0, predicted_value))
            
            # Confidence interval
            ci = 1.96 * std_err * np.sqrt(1 + 1/len(x) + (forecast_x - np.mean(x))**2 / np.sum((x - np.mean(x))**2))
            forecast_high.append(max(0, predicted_value + ci))
            forecast_low.append(max(0, predicted_value - ci))
        
        return jsonify({
            "historical": {
                "labels": months,
                "values": y.astype(float).tolist()
            },
            "forecast": {
                "labels": forecast_months,
                "values": [round(v, 2) for v in forecast_values],
                "high": [round(v, 2) for v in forecast_high],
                "low": [round(v, 2) for v in forecast_low]
            },
            "trend": "📈 Upward" if slope > 0 else "📉 Downward",
            "r_squared": round(r_value**2, 4)
        }), 200
    except Exception as e:
        logger.error(f"Error generating sales forecast: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route("/api/expense-forecast", methods=["GET"])
def expense_forecast():
    """Generate expense forecast"""
    try:
        df = run_sql("""
            SELECT DATE_FORMAT(date, '%Y-%m') as month, SUM(amount) as expenses 
            FROM expenses 
            GROUP BY DATE_FORMAT(date, '%Y-%m') 
            ORDER BY month ASC
        """)
        
        if df.empty or len(df) < 3:
            return jsonify({"error": "Insufficient data for forecast"}), 400
        
        x = np.arange(len(df))
        y = df['expenses'].values
        
        slope, intercept, r_value, p_value, std_err = stats.linregress(x, y)
        
        months = df['month'].tolist()
        forecast_months = []
        forecast_values = []
        
        last_date = datetime.strptime(months[-1], '%Y-%m')
        
        for i in range(1, 4):
            next_date = last_date + timedelta(days=30*i)
            forecast_months.append(next_date.strftime('%Y-%m'))
            forecast_x = len(df) + i - 1
            predicted_value = slope * forecast_x + intercept
            forecast_values.append(max(0, predicted_value))
        
        return jsonify({
            "forecast": {
                "labels": forecast_months,
                "values": [round(v, 2) for v in forecast_values]
            },
            "trend": "📈 Increasing" if slope > 0 else "📉 Decreasing"
        }), 200
    except Exception as e:
        logger.error(f"Error generating expense forecast: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route("/api/growth-analysis", methods=["GET"])
def growth_analysis():
    """Analyze sales growth and provide metrics"""
    try:
        df = run_sql("""
            SELECT DATE_FORMAT(shdate, '%Y-%m') as month, SUM(netsales) as sales 
            FROM sales 
            GROUP BY DATE_FORMAT(shdate, '%Y-%m') 
            ORDER BY month ASC
        """)
        
        if df.empty or len(df) < 2:
            return jsonify({"error": "Insufficient data"}), 400
        
        sales = df['sales'].values
        
        # Calculate YoY growth
        if len(sales) >= 12:
            yoy_growth = ((sales[-1] - sales[-12]) / sales[-12] * 100) if sales[-12] != 0 else 0
        else:
            yoy_growth = 0
        
        # Calculate MoM growth
        mom_growth = ((sales[-1] - sales[-2]) / sales[-2] * 100) if sales[-2] != 0 else 0
        
        # Calculate CAGR
        periods = len(sales) - 1
        if periods > 0 and sales[0] > 0:
            cagr = (((sales[-1] / sales[0]) ** (1/periods)) - 1) * 100
        else:
            cagr = 0
        
        # Calculate average
        avg_sales = np.mean(sales)
        
        return jsonify({
            "yoy_growth": round(yoy_growth, 2),
            "mom_growth": round(mom_growth, 2),
            "cagr": round(cagr, 2),
            "avg_monthly_sales": round(avg_sales, 2),
            "volatility": round(np.std(sales), 2)
        }), 200
    except Exception as e:
        logger.error(f"Error analyzing growth: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route("/api/sales-by-client-detail", methods=["GET"])
def sales_by_client_detail():
    """Get detailed sales data by client for drill-down"""
    try:
        client = request.args.get('client')
        if not client:
            return jsonify({"error": "Client parameter required"}), 400
        
        df = run_sql(f"""
            SELECT shdate, clientname, country, netsales 
            FROM sales 
            WHERE clientname = %s
            ORDER BY shdate DESC
        """, (client,))
        
        # This won't work with current db.py, let's use a simpler approach
        df = run_sql(f"""
            SELECT DATE_FORMAT(shdate, '%Y-%m-%d') as date, netsales, country
            FROM sales 
            WHERE clientname = '{client}'
            ORDER BY shdate DESC
            LIMIT 20
        """)
        
        if df.empty:
            return jsonify({"detail": []}), 200
        
        data = df.to_dict('records')
        return jsonify({"detail": data}), 200
    except Exception as e:
        logger.error(f"Error fetching client detail: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route("/api/filtered-sales", methods=["GET"])
def filtered_sales():
    """Get filtered sales data based on criteria"""
    try:
        country = request.args.get('country')
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')
        
        query = "SELECT DATE_FORMAT(shdate, '%Y-%m') as month, SUM(netsales) as sales FROM sales WHERE 1=1"
        
        if country:
            query += f" AND country = '{country}'"
        if start_date:
            query += f" AND shdate >= '{start_date}'"
        if end_date:
            query += f" AND shdate <= '{end_date}'"
        
        query += " GROUP BY DATE_FORMAT(shdate, '%Y-%m') ORDER BY month ASC"
        
        df = run_sql(query)
        
        data = {
            "labels": df['month'].tolist() if not df.empty else [],
            "values": df['sales'].astype(float).tolist() if not df.empty else []
        }
        return jsonify(data), 200
    except Exception as e:
        logger.error(f"Error fetching filtered sales: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route("/api/countries", methods=["GET"])
def get_countries():
    """Get list of countries for filtering"""
    try:
        df = run_sql("SELECT DISTINCT country FROM sales ORDER BY country ASC")
        countries = df['country'].tolist() if not df.empty else []
        return jsonify({"countries": countries}), 200
    except Exception as e:
        logger.error(f"Error fetching countries: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route("/ask-ai", methods=["POST"])
def ask_ai():
    try:
        data = request.json
        if not data or "question" not in data:
            return jsonify({"error": "No question provided"}), 400
        
        question = data.get("question", "").strip()
        if not question:
            return jsonify({"error": "Question cannot be empty"}), 400
        
        logger.info(f"Processing question: {question}")
        result = agent(question)
        
        return jsonify(result), 200
    
    except Exception as e:
        logger.error(f"Error in /ask-ai: {str(e)}")
        return jsonify({
            "error": "An error occurred while processing your request",
            "insight": f"❌ {str(e)}",
            "table": None,
            "sql": None
        }), 500

@app.route("/health", methods=["GET"])
def health():
    """Health check endpoint"""
    return jsonify({"status": "healthy"}), 200

if __name__ == "__main__":
    app.run(debug=True, host="0.0.0.0", port=5000)

