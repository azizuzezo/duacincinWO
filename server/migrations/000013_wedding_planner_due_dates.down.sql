alter table wedding_planner_tasks
    drop column if exists due_date,
    drop column if exists is_custom;
