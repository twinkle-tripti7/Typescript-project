// supabase/functions/create-task/index.ts

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

serve(async (req) => {
  try {
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Only POST allowed" }), {
        status: 405,
      });
    }

    const body = await req.json();
    const { application_id, task_type, due_at } = body;

    // 1. Validate inputs
    if (!application_id || !task_type || !due_at) {
      return new Response(JSON.stringify({ error: "Missing fields" }), {
        status: 400,
      });
    }

    const validTypes = ["call", "email", "review"];
    if (!validTypes.includes(task_type)) {
      return new Response(JSON.stringify({ error: "Invalid task_type" }), {
        status: 400,
      });
    }

    const dueDate = new Date(due_at);
    if (isNaN(dueDate.getTime()) || dueDate <= new Date()) {
      return new Response(JSON.stringify({ error: "due_at must be in the future" }), {
        status: 400,
      });
    }

    // 2. Supabase client
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // 3. Fetch tenant_id from application
    const { data: app, error: appError } = await supabase
      .from("applications")
      .select("tenant_id")
      .eq("id", application_id)
      .single();

    if (appError || !app) {
      return new Response(JSON.stringify({ error: "Invalid application_id" }), {
        status: 400,
      });
    }

    // 4. Insert task with tenant_id
    const { data, error } = await supabase
      .from("tasks")
      .insert({
        tenant_id: app.tenant_id, // FIXED
        related_id: application_id,
        type: task_type,
        title: "Auto generated task",
        due_at,
      })
      .select("id")
      .single();

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 400,
      });
    }

    // 5. Broadcast realtime event
    await supabase.channel("task.created").send({
      type: "broadcast",
      event: "task.created",
      payload: { task_id: data.id },
    });

    return new Response(
      JSON.stringify({ success: true, task_id: data.id }),
      { status: 200 }
    );

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
    });
  }
});
