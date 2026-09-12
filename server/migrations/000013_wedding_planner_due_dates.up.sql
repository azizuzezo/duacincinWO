alter table wedding_planner_tasks
    add column due_date date,
    add column is_custom boolean not null default false;
