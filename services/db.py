import pandas as pd
from sqlalchemy import create_engine
import logging

logger = logging.getLogger(__name__)

# Database connection parameters
db_params = {
    'host': 'localhost',
    'user': 'root',
    'password': 'Realign1234!',
    'database': 'sales_db',
}

# Create SQLAlchemy engine
try:
    engine = create_engine(
        f"mysql+mysqlconnector://{db_params['user']}:{db_params['password']}@{db_params['host']}/{db_params['database']}",
        pool_pre_ping=True,
        pool_recycle=3600
    )
    # Test connection
    with engine.connect() as connection:
        logger.info("✅ Successfully connected to MySQL database")
except Exception as e:
    logger.error(f"❌ Database connection error: {e}")
    engine = None

def run_sql(sql):
    """Execute SQL query and return pandas DataFrame"""
    try:
        if engine is None:
            logger.error("Database engine is not initialized")
            return pd.DataFrame()
        
        df = pd.read_sql(sql, engine)
        logger.info(f"Query executed successfully. Rows returned: {len(df)}")
        return df
    except Exception as e:
        logger.error(f"SQL Error: {e}")
        return pd.DataFrame()
