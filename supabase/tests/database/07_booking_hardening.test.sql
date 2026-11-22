-- Migrations 0011/0019: online bookings cannot rename patients, redirect their e-mail or smuggle links into messages.
begin;
select plan(12);

-- existing patient
insert into public.patients (phone, full_name) values ('+251911777001', 'Tigist Haile');

select is(public._upsert_patient('+251911777001', 'Someone Else'),
          (select id from public.patients where phone = '+251911777001'), 'same phone returns the existing patient');
select is((select full_name from public.patients where phone = '+251911777001'), 'Tigist Haile',
          'an online booking does not overwrite the saved name');
select lives_ok($$select public._upsert_patient('+251911777002', 'አበበ ከበደ')$$, 'Amharic names are accepted');
select lives_ok($$select public._upsert_patient('+251911777003', 'Mary-Jane O''Neil')$$, 'hyphen and apostrophe are accepted');
select throws_ok($$select public._upsert_patient('+251911777004', 'Win prize at evil.com')$$,
                 'P0001', 'INVALID_NAME', 'a web address in the name is rejected');
select throws_ok($$select public._upsert_patient('+251911777005', 'Visit https: now')$$,
                 'P0001', 'INVALID_NAME', 'https: in the name is rejected');
select throws_ok($$select public._upsert_patient('+251911777006', 'Call 0911223344')$$,
                 'P0001', 'INVALID_NAME', 'digits in the name are rejected');

-- 0019: e-mail address and Safaricom numbers
select lives_ok($$select public._upsert_patient('+251711777007', 'Safari Com')$$, 'Safaricom (07) numbers are accepted');
select public._upsert_patient('+251911777001', 'Tigist Haile', '  Tigist@Example.com ');
select is((select email from public.patients where phone = '+251911777001'), 'tigist@example.com',
          'an e-mail is saved (trimmed, lower-case) when the patient has none');
select public._upsert_patient('+251911777001', 'Someone Else', 'attacker@evil.test');
select is((select email from public.patients where phone = '+251911777001'), 'tigist@example.com',
          'a later booking does not overwrite the saved e-mail');
select throws_ok($$select public._upsert_patient('+251911777008', 'Bad Mail', 'not-an-email')$$,
                 'P0001', 'INVALID_EMAIL', 'an invalid e-mail is rejected');
select is(public._clean_email(''), null, 'an empty e-mail counts as none');

select * from finish();
rollback;
