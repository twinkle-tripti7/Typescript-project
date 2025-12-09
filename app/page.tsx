"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../lib/supabaseClient";

interface Task {
  id: string; // uuid
  title: string;
  related_id: string; // FK → applications table
  due_at: string;
  status: string;
}

const fetchTasksToday = async (): Promise<Task[]> => {
  const today = new Date();
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString();
  const end = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1).toISOString();

  const { data, error } = await supabase
    .from("tasks")
    .select("*")
    .gte("due_at", start)
    .lt("due_at", end)
    .order("due_at");

  if (error) throw new Error(error.message);
  return data || [];
};

const updateTaskStatus = async (id: string) => {
  const { error } = await supabase
    .from("tasks")
    .update({ status: "completed" })
    .eq("id", id);

  if (error) throw new Error(error.message);
};

export default function TodayDashboard() {
  const queryClient = useQueryClient();

  const {
    data: tasks = [],
    isPending,
    isError,
    error,
  } = useQuery({
    queryKey: ["tasksToday"],
    queryFn: fetchTasksToday,
  });

  const mutation = useMutation({
    mutationFn: updateTaskStatus,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tasksToday"] }),
  });

  if (isPending) return <p>Loading tasks...</p>;
  if (isError) return <p>Error: {error.message}</p>;

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Today's Tasks</h1>

      {tasks.length === 0 ? (
        <p>No tasks for today!</p>
      ) : (
        <table className="w-full border text-left">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-2 border">Title</th>
              <th className="p-2 border">Application ID</th>
              <th className="p-2 border">Due At</th>
              <th className="p-2 border">Status</th>
              <th className="p-2 border">Action</th>
            </tr>
          </thead>

          <tbody>
            {tasks.map((task) => (
              <tr key={task.id} className="hover:bg-gray-50">
                <td className="p-2 border">{task.title}</td>
                <td className="p-2 border">{task.related_id}</td>
                <td className="p-2 border">
                  {new Date(task.due_at).toLocaleString()}
                </td>
                <td className="p-2 border capitalize">{task.status}</td>

                <td className="p-2 border">
                  {task.status !== "completed" ? (
                    <button
                      className="px-3 py-1 bg-blue-500 text-white rounded disabled:opacity-50"
                      onClick={() => mutation.mutate(task.id)}
                      disabled={mutation.isPending}
                    >
                      {mutation.isPending ? "Updating..." : "Mark Complete"}
                    </button>
                  ) : (
                    <span className="text-green-600 font-semibold">Done</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {mutation.isError && (
        <p className="text-red-500 mt-2">Error updating task!</p>
      )}
    </div>
  );
}
