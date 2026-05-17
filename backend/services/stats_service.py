from datetime import datetime, timezone, timedelta, timedelta
from backend.database import incidents_collection, performance_collection


class StatsService:
    async def get_dashboard_stats(self) -> dict:
        """Get all stats needed for dashboard overview."""

        # Total incidents
        total = await incidents_collection.count_documents({})

        # Today's incidents
        today_start = datetime.now(timezone(timedelta(hours=5))).replace(
            hour=0, minute=0, second=0, microsecond=0
        )
        today = await incidents_collection.count_documents({
            "detected_at": {"$gte": today_start}
        })

        # This week
        week_start = datetime.now(timezone(timedelta(hours=5))) - timedelta(days=7)
        this_week = await incidents_collection.count_documents({
            "detected_at": {"$gte": week_start}
        })

        # This month
        month_start = datetime.now(timezone(timedelta(hours=5))).replace(day=1, hour=0, minute=0, second=0)
        this_month = await incidents_collection.count_documents({
            "detected_at": {"$gte": month_start}
        })

        # Status counts
        new          = await incidents_collection.count_documents({"status": "new"})
        acknowledged = await incidents_collection.count_documents({"status": "acknowledged"})
        resolved     = await incidents_collection.count_documents({"status": "resolved"})

        # Latest performance metrics
        latest_perf = await performance_collection.find_one(
            {}, sort=[("recorded_at", -1)]
        )

        return {
            "total_incidents":        total,
            "today_incidents":        today,
            "this_week_incidents":    this_week,
            "this_month_incidents":   this_month,
            "new_incidents":          new,
            "acknowledged_incidents": acknowledged,
            "resolved_incidents":     resolved,
            "latest_performance": {
                "map50":     latest_perf["map50"]     if latest_perf else 0,
                "precision": latest_perf["precision"] if latest_perf else 0,
                "recall":    latest_perf["recall"]    if latest_perf else 0,
                "fps":       latest_perf["fps"]       if latest_perf else 0,
            }
        }

    async def get_recent_incidents(self, limit: int = 5) -> list:
        """Get most recent incidents for dashboard feed."""

        cursor = incidents_collection.find({})\
            .sort("detected_at", -1)\
            .limit(limit)

        incidents = []
        async for doc in cursor:
            incidents.append({
                "id":               str(doc["_id"]),
                "camera_name":      doc["camera_name"],
                "location":         doc["location"],
                "confidence_score": doc["confidence_score"],
                "detected_at":      doc["detected_at"].strftime("%Y-%m-%d %H:%M:%S"),
                "status":           doc.get("status", "new"),
                "frame_path":       doc["frame_path"],
            })

        return incidents

    async def get_monthly_data(self, year: int) -> list:
        """Get monthly incident counts for chart."""

        start = datetime(year, 1, 1)
        end   = datetime(year, 12, 31, 23, 59, 59)

        cursor = incidents_collection.find({
            "detected_at": {"$gte": start, "$lte": end}
        })

        monthly_counts = {i: 0 for i in range(1, 13)}
        async for doc in cursor:
            month = doc["detected_at"].month
            monthly_counts[month] += 1

        month_names = [
            "Jan", "Feb", "Mar", "Apr", "May", "Jun",
            "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
        ]

        return [
            {"month": month_names[i - 1], "count": monthly_counts[i]}
            for i in range(1, 13)
        ]

    async def get_hourly_data(self) -> list:
        """Get hourly incident counts for heatmap."""

        cursor = incidents_collection.find({})

        hourly_counts = {i: 0 for i in range(24)}
        async for doc in cursor:
            hour = doc["detected_at"].hour
            hourly_counts[hour] += 1

        return [
            {"hour": f"{h:02d}:00", "count": hourly_counts[h]}
            for h in range(24)
        ]