insert into users(name,email,password) 
select left(md5(random()::text),10),
		'user_' || seq || '@' || (
		 case random()::INT
			WHEN 0 THEN 'gmail'
			WHEN 1 THEN 'yahoo'
			END
		) || '.com',
		left(md5(random()::text),10)
		FROM generate_series(1,10) seq;

select * from users;	
	