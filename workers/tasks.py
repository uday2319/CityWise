from workers.celery_app import celery_app


@celery_app.task(bind=True, max_retries=3)
def generate_itinerary_async(
    self,
    city: str,
    duration_days: int,
    budget: str,
    interests: list,
    session_id: str,
):
    """
    Background task for heavy itinerary generation.
    Used when multiple users generate at the same time.
    """
    try:
        from backend.services.ml_service import MLService
        ml = MLService()

        import asyncio
        loop = asyncio.new_event_loop()
        loop.run_until_complete(ml.load_all())

        result = ml.generate_itinerary(city, duration_days, budget, interests)
        return {"session_id": session_id, "itinerary": result, "status": "success"}

    except Exception as exc:
        raise self.retry(exc=exc, countdown=5)


@celery_app.task
def compute_trip_analytics(session_id: str):
    """Compute analytics for a completed trip."""
    return {
        "session_id": session_id,
        "status": "computed",
        "message": "Analytics task complete",
    }