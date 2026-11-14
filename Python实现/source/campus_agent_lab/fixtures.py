"""原创构造资料；不对应任何真实学校、公告或执行结果。"""

ANNOUNCEMENTS = [{
    "doc_id": "D1", "facility": "图书馆", "period": "本学期",
    "title": "本学期图书馆开放安排", "publisher": "图书馆",
    "text": "图书馆工作日12:00—18:00开放，周末闭馆。",
}]

VENUES = [
    {"venue_id": "V1", "name": "科学活动室", "period": "本学期",
     "day": "周二", "start": 15, "end": 17, "hours_source": "S1"},
    {"venue_id": "V2", "name": "阅览活动室", "period": "本学期",
     "day": "周二", "start": 15, "end": 17, "hours_source": "S2"},
]
DETAILS = {
    "V1": {"equipment": ["投影仪"], "ramp": True, "source": "E1", "conflict": False},
    "V2": {"equipment": ["投影仪"], "ramp": False, "source": "E2", "conflict": False},
}
TASK = {"period": "本学期", "day": "周二", "start": 15, "end": 16,
        "equipment": "投影仪", "ramp": True}
