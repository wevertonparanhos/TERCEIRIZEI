alter table users add column client_id uuid references clients(id);
create index users_client_id_idx on users(client_id);

-- clients
drop policy "clients_select_own_tenant_or_super_admin" on clients;
create policy "clients_select_staff" on clients for select using (
  current_role_name() = 'SUPER_ADMIN' or (tenant_id = current_tenant_id() and current_role_name() <> 'CLIENT')
);
create policy "clients_select_self_client" on clients for select using (
  id = (select client_id from users where id = auth.uid())
);

-- companies
drop policy "companies_select_own_tenant_or_super_admin" on companies;
create policy "companies_select_staff" on companies for select using (
  current_role_name() = 'SUPER_ADMIN' or (tenant_id = current_tenant_id() and current_role_name() <> 'CLIENT')
);
create policy "companies_select_self_client" on companies for select using (
  client_id = (select client_id from users where id = auth.uid())
);

-- processes
drop policy "processes_select_own_tenant_or_super_admin" on processes;
create policy "processes_select_staff" on processes for select using (
  current_role_name() = 'SUPER_ADMIN' or (tenant_id = current_tenant_id() and current_role_name() <> 'CLIENT')
);
create policy "processes_select_self_client" on processes for select using (
  client_id = (select client_id from users where id = auth.uid())
);

-- process_steps (join via process)
drop policy "process_steps_select_via_process_tenant" on process_steps;
create policy "process_steps_select_staff" on process_steps for select using (
  current_role_name() = 'SUPER_ADMIN' or exists (
    select 1 from processes p where p.id = process_steps.process_id and p.tenant_id = current_tenant_id() and current_role_name() <> 'CLIENT'
  )
);
create policy "process_steps_select_self_client" on process_steps for select using (
  exists (
    select 1 from processes p where p.id = process_steps.process_id and p.client_id = (select client_id from users where id = auth.uid())
  )
);

-- checklist_items (join via process)
drop policy "checklist_items_select_via_process_tenant" on checklist_items;
create policy "checklist_items_select_staff" on checklist_items for select using (
  current_role_name() = 'SUPER_ADMIN' or exists (
    select 1 from processes p where p.id = checklist_items.process_id and p.tenant_id = current_tenant_id() and current_role_name() <> 'CLIENT'
  )
);
create policy "checklist_items_select_self_client" on checklist_items for select using (
  exists (
    select 1 from processes p where p.id = checklist_items.process_id and p.client_id = (select client_id from users where id = auth.uid())
  )
);

-- documents
drop policy "documents_select_own_tenant_or_super_admin" on documents;
create policy "documents_select_staff" on documents for select using (
  current_role_name() = 'SUPER_ADMIN' or (tenant_id = current_tenant_id() and current_role_name() <> 'CLIENT')
);
create policy "documents_select_self_client" on documents for select using (
  client_id = (select client_id from users where id = auth.uid())
);

-- document_versions (join via document)
drop policy "document_versions_select_via_document_tenant" on document_versions;
create policy "document_versions_select_staff" on document_versions for select using (
  current_role_name() = 'SUPER_ADMIN' or exists (
    select 1 from documents d where d.id = document_versions.document_id and d.tenant_id = current_tenant_id() and current_role_name() <> 'CLIENT'
  )
);
create policy "document_versions_select_self_client" on document_versions for select using (
  exists (
    select 1 from documents d where d.id = document_versions.document_id and d.client_id = (select client_id from users where id = auth.uid())
  )
);

-- document_requests
drop policy "document_requests_select_own_tenant_or_super_admin" on document_requests;
create policy "document_requests_select_staff" on document_requests for select using (
  current_role_name() = 'SUPER_ADMIN' or (tenant_id = current_tenant_id() and current_role_name() <> 'CLIENT')
);
create policy "document_requests_select_self_client" on document_requests for select using (
  client_id = (select client_id from users where id = auth.uid())
);

-- protocols (join via process, sem client_id direto)
drop policy "protocols_select_own_tenant_or_super_admin" on protocols;
create policy "protocols_select_staff" on protocols for select using (
  current_role_name() = 'SUPER_ADMIN' or (tenant_id = current_tenant_id() and current_role_name() <> 'CLIENT')
);
create policy "protocols_select_self_client" on protocols for select using (
  exists (
    select 1 from processes p where p.id = protocols.process_id and p.client_id = (select client_id from users where id = auth.uid())
  )
);

-- compliance_items (join via company, sem client_id direto)
drop policy "compliance_items_select_own_tenant_or_super_admin" on compliance_items;
create policy "compliance_items_select_staff" on compliance_items for select using (
  current_role_name() = 'SUPER_ADMIN' or (tenant_id = current_tenant_id() and current_role_name() <> 'CLIENT')
);
create policy "compliance_items_select_self_client" on compliance_items for select using (
  exists (
    select 1 from companies c where c.id = compliance_items.company_id and c.client_id = (select client_id from users where id = auth.uid())
  )
);
