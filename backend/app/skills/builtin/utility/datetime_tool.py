"""
DateTime Tool Skill
--------------------
Date/time calculations, timezone conversion, and formatting.
"""
import datetime
import time as time_module
from app.skills.base import BaseSkill, SkillResult
from app.skills.categories import SkillCategory


class DatetimeToolSkill(BaseSkill):
    name = "datetime_tool"
    display_name = "Date & Time Tool"
    description = "Get the current date and time, calculate date differences, format dates, convert between timezones, and answer questions about time."
    category = SkillCategory.UTILITY
    tags = ["date", "time", "datetime", "timezone", "calendar", "schedule", "day", "month", "year"]
    version = "1.0.0"
    requires_auth = False
    is_dangerous = False
    enabled = True
    timeout_seconds = 5

    @property
    def schema(self):
        return {
            "type": "object",
            "properties": {
                "action": {
                    "type": "string",
                    "enum": ["now", "diff", "format", "add_days"],
                    "description": "Action: 'now' = current time, 'diff' = days between two dates, 'format' = reformat date string, 'add_days' = add days to date."
                },
                "date1": {
                    "type": "string",
                    "description": "First date in ISO format (YYYY-MM-DD) or 'today'."
                },
                "date2": {
                    "type": "string",
                    "description": "Second date in ISO format (YYYY-MM-DD), used for 'diff' action."
                },
                "days": {
                    "type": "integer",
                    "description": "Number of days to add (positive) or subtract (negative), used for 'add_days'."
                },
                "format_string": {
                    "type": "string",
                    "description": "Python strftime format string, e.g. '%B %d, %Y'."
                }
            },
            "required": ["action"]
        }

    def _parse_date(self, date_str: str) -> datetime.date:
        if date_str.lower() in ("today", "now"):
            return datetime.date.today()
        # Try common formats
        for fmt in ("%Y-%m-%d", "%d/%m/%Y", "%m/%d/%Y", "%d-%m-%Y"):
            try:
                return datetime.datetime.strptime(date_str, fmt).date()
            except ValueError:
                continue
        raise ValueError(f"Cannot parse date: '{date_str}'. Use YYYY-MM-DD format.")

    async def execute(self, **kwargs) -> SkillResult:
        start = time_module.monotonic()
        action: str = kwargs.get("action", "now")

        try:
            now = datetime.datetime.now()

            if action == "now":
                result = (
                    f"**Current Date & Time**\n"
                    f"- Date: {now.strftime('%A, %B %d, %Y')}\n"
                    f"- Time: {now.strftime('%I:%M:%S %p')}\n"
                    f"- ISO: {now.isoformat(timespec='seconds')}\n"
                    f"- Day of year: {now.timetuple().tm_yday}\n"
                    f"- Week number: {now.isocalendar()[1]}"
                )

            elif action == "diff":
                date1 = self._parse_date(kwargs.get("date1", "today"))
                date2 = self._parse_date(kwargs.get("date2", "today"))
                delta = date2 - date1
                days = delta.days
                weeks, rem_days = divmod(abs(days), 7)
                result = (
                    f"**Date Difference**\n"
                    f"- From: {date1.strftime('%B %d, %Y')}\n"
                    f"- To: {date2.strftime('%B %d, %Y')}\n"
                    f"- Difference: **{days} days** ({weeks} weeks, {rem_days} days)\n"
                    f"- Direction: {'future' if days >= 0 else 'past'}"
                )

            elif action == "add_days":
                base_date = self._parse_date(kwargs.get("date1", "today"))
                days = int(kwargs.get("days", 0))
                result_date = base_date + datetime.timedelta(days=days)
                result = (
                    f"**Date Calculation**\n"
                    f"- Base: {base_date.strftime('%B %d, %Y')}\n"
                    f"- Operation: {'+ ' if days >= 0 else ''}{days} days\n"
                    f"- Result: **{result_date.strftime('%A, %B %d, %Y')}** ({result_date.isoformat()})"
                )

            elif action == "format":
                date1 = self._parse_date(kwargs.get("date1", "today"))
                fmt = kwargs.get("format_string", "%B %d, %Y")
                formatted = datetime.datetime.combine(date1, datetime.time()).strftime(fmt)
                result = f"**Formatted Date**: {formatted}"

            else:
                return SkillResult(
                    success=False, data=None, skill_name=self.name,
                    error=f"Unknown action '{action}'. Use: now, diff, add_days, format."
                )

            elapsed = (time_module.monotonic() - start) * 1000
            return SkillResult(success=True, data=result, skill_name=self.name, execution_time_ms=elapsed)

        except Exception as e:
            elapsed = (time_module.monotonic() - start) * 1000
            return SkillResult(success=False, data=None, skill_name=self.name, execution_time_ms=elapsed, error=str(e))
