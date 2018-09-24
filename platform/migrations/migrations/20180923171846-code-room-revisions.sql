up:
alter table code_rooms change hash room_hash varchar(40);
alter table code_rooms add hash varchar(64) after code;

create table code_room_revisions (
    code_room_revision_id int unsigned not null auto_increment,
    code_room_id int unsigned null,
    user_id int unsigned null,
    hash varchar(64) not null,
    op varchar(3) not null,
    start int unsigned not null,
    end int unsigned not null,
    m_sl int unsigned not null,
    m_el int unsigned not null,
    m_sc int unsigned not null,
    m_ec int unsigned not null,
    code mediumtext null,
    created_at datetime not null,
    primary key (code_room_revision_id),
    key code_room_id (code_room_id),
    key user_id (user_id),
    key hash (hash),
    key created_at (created_at)
)engine=innodb default charset=utf8;

down:
alter table code_rooms drop column hash;
alter table code_rooms change room_hash hash varchar(40);

drop table code_room_revisions;
