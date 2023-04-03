insert into posts(author_id,subject,description,lat,lon) 
select  u.user_id,
		left(md5(random()::text),20),
		left(md5(random()::text),50),
		random()*180-90,
		random()*360-180
	from generate_series(1,10) cross join (select user_id from users) u order by random() limit 10;	
select * from posts;	
	