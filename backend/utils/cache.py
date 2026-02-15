"""
Redis Caching Utility
Provides caching functionality with Redis backend and in-memory fallback.
"""
import json
import logging
import os
from datetime import datetime, timedelta
from typing import Any, Optional, Callable
from functools import wraps
import asyncio
import hashlib

logger = logging.getLogger(__name__)

# Try to import redis
try:
    import redis.asyncio as aioredis
    REDIS_AVAILABLE = True
except ImportError:
    REDIS_AVAILABLE = False
    logger.warning("Redis library not available, using in-memory cache")


class InMemoryCache:
    """Simple in-memory cache as fallback when Redis is unavailable"""
    
    def __init__(self):
        self._cache: dict = {}
        self._expiry: dict = {}
    
    async def get(self, key: str) -> Optional[str]:
        """Get value from cache"""
        if key in self._cache:
            # Check if expired
            if key in self._expiry and datetime.now() > self._expiry[key]:
                del self._cache[key]
                del self._expiry[key]
                return None
            return self._cache[key]
        return None
    
    async def set(self, key: str, value: str, ex: int = None) -> bool:
        """Set value in cache with optional expiry (seconds)"""
        self._cache[key] = value
        if ex:
            self._expiry[key] = datetime.now() + timedelta(seconds=ex)
        return True
    
    async def delete(self, key: str) -> int:
        """Delete key from cache"""
        if key in self._cache:
            del self._cache[key]
            if key in self._expiry:
                del self._expiry[key]
            return 1
        return 0
    
    async def delete_pattern(self, pattern: str) -> int:
        """Delete all keys matching pattern (simple prefix match)"""
        prefix = pattern.rstrip('*')
        keys_to_delete = [k for k in self._cache.keys() if k.startswith(prefix)]
        for key in keys_to_delete:
            del self._cache[key]
            if key in self._expiry:
                del self._expiry[key]
        return len(keys_to_delete)
    
    async def exists(self, key: str) -> bool:
        """Check if key exists and is not expired"""
        if key in self._cache:
            if key in self._expiry and datetime.now() > self._expiry[key]:
                del self._cache[key]
                del self._expiry[key]
                return False
            return True
        return False
    
    async def flush_all(self) -> bool:
        """Clear all cache"""
        self._cache.clear()
        self._expiry.clear()
        return True
    
    def get_stats(self) -> dict:
        """Get cache statistics"""
        return {
            "type": "in-memory",
            "keys": len(self._cache),
            "memory_usage": "N/A"
        }


class CacheManager:
    """
    Manages caching with Redis or in-memory fallback.
    
    Usage:
        cache = CacheManager()
        await cache.initialize()
        
        # Set/Get
        await cache.set("key", {"data": "value"}, ttl=300)
        data = await cache.get("key")
        
        # Decorator
        @cache.cached(ttl=300, prefix="dashboard")
        async def get_dashboard_stats():
            ...
    """
    
    def __init__(self):
        self._redis: Optional[Any] = None
        self._fallback = InMemoryCache()
        self._use_redis = False
        self._initialized = False
    
    async def initialize(self) -> bool:
        """Initialize cache connection"""
        if self._initialized:
            return self._use_redis
        
        redis_url = os.environ.get('REDIS_URL')
        
        if redis_url and REDIS_AVAILABLE:
            try:
                self._redis = aioredis.from_url(
                    redis_url,
                    encoding="utf-8",
                    decode_responses=True,
                    socket_timeout=5,
                    socket_connect_timeout=5
                )
                # Test connection
                await self._redis.ping()
                self._use_redis = True
                logger.info(f"Redis cache connected: {redis_url}")
            except Exception as e:
                logger.warning(f"Redis connection failed, using in-memory cache: {e}")
                self._use_redis = False
        else:
            logger.info("Using in-memory cache (no REDIS_URL configured)")
            self._use_redis = False
        
        self._initialized = True
        return self._use_redis
    
    @property
    def client(self):
        """Get active cache client"""
        return self._redis if self._use_redis else self._fallback
    
    async def get(self, key: str) -> Optional[Any]:
        """Get value from cache, deserialize JSON"""
        try:
            value = await self.client.get(key)
            if value:
                return json.loads(value)
            return None
        except Exception as e:
            logger.error(f"Cache get error: {e}")
            return None
    
    async def set(self, key: str, value: Any, ttl: int = 300) -> bool:
        """Set value in cache, serialize as JSON"""
        try:
            serialized = json.dumps(value, default=str)
            await self.client.set(key, serialized, ex=ttl)
            return True
        except Exception as e:
            logger.error(f"Cache set error: {e}")
            return False
    
    async def delete(self, key: str) -> bool:
        """Delete key from cache"""
        try:
            await self.client.delete(key)
            return True
        except Exception as e:
            logger.error(f"Cache delete error: {e}")
            return False
    
    async def invalidate_pattern(self, pattern: str) -> int:
        """Invalidate all keys matching pattern"""
        try:
            if self._use_redis:
                keys = []
                async for key in self._redis.scan_iter(match=pattern):
                    keys.append(key)
                if keys:
                    await self._redis.delete(*keys)
                return len(keys)
            else:
                return await self._fallback.delete_pattern(pattern)
        except Exception as e:
            logger.error(f"Cache invalidate error: {e}")
            return 0
    
    async def flush_all(self) -> bool:
        """Flush all cache (use with caution)"""
        try:
            if self._use_redis:
                await self._redis.flushdb()
            else:
                await self._fallback.flush_all()
            return True
        except Exception as e:
            logger.error(f"Cache flush error: {e}")
            return False
    
    def get_stats(self) -> dict:
        """Get cache statistics"""
        if self._use_redis:
            return {
                "type": "redis",
                "connected": True,
                "url": os.environ.get('REDIS_URL', 'N/A')
            }
        return self._fallback.get_stats()
    
    def cached(self, ttl: int = 300, prefix: str = "cache", key_builder: Callable = None):
        """
        Decorator for caching async function results.
        
        Args:
            ttl: Time to live in seconds (default 5 minutes)
            prefix: Cache key prefix
            key_builder: Optional function to build custom cache key
        
        Usage:
            @cache.cached(ttl=300, prefix="dashboard")
            async def get_dashboard_stats():
                return {"total": 100}
        """
        def decorator(func: Callable):
            @wraps(func)
            async def wrapper(*args, **kwargs):
                # Build cache key
                if key_builder:
                    cache_key = key_builder(*args, **kwargs)
                else:
                    # Default key: prefix:function_name:hash(args)
                    args_str = json.dumps({"args": args, "kwargs": kwargs}, sort_keys=True, default=str)
                    args_hash = hashlib.md5(args_str.encode()).hexdigest()[:8]
                    cache_key = f"{prefix}:{func.__name__}:{args_hash}"
                
                # Try to get from cache
                cached_value = await self.get(cache_key)
                if cached_value is not None:
                    logger.debug(f"Cache hit: {cache_key}")
                    return cached_value
                
                # Execute function and cache result
                logger.debug(f"Cache miss: {cache_key}")
                result = await func(*args, **kwargs)
                await self.set(cache_key, result, ttl=ttl)
                
                return result
            
            # Add method to invalidate this function's cache
            async def invalidate(*args, **kwargs):
                if key_builder:
                    cache_key = key_builder(*args, **kwargs)
                    await self.delete(cache_key)
                else:
                    pattern = f"{prefix}:{func.__name__}:*"
                    await self.invalidate_pattern(pattern)
            
            wrapper.invalidate = invalidate
            return wrapper
        
        return decorator


# Global cache instance
cache = CacheManager()


# Cache TTL constants (in seconds)
class CacheTTL:
    """Standard cache TTL values"""
    SHORT = 60          # 1 minute - for rapidly changing data
    MEDIUM = 300        # 5 minutes - for dashboard stats
    LONG = 900          # 15 minutes - for semi-static data
    VERY_LONG = 3600    # 1 hour - for rarely changing data
    DAY = 86400         # 24 hours - for static reference data


# Helper functions for common cache operations
async def invalidate_project_caches():
    """Invalidate all project-related caches"""
    await cache.invalidate_pattern("dashboard:*")
    await cache.invalidate_pattern("projects:*")


async def invalidate_amc_caches():
    """Invalidate all AMC-related caches"""
    await cache.invalidate_pattern("amc:*")


async def invalidate_report_caches():
    """Invalidate all report-related caches"""
    await cache.invalidate_pattern("reports:*")
    await cache.invalidate_pattern("test_reports:*")
