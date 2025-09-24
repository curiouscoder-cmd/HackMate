import { NextRequest, NextResponse } from 'next/server';
import { getTasksAction } from '@/lib/actions/task-actions';

// Use the optimized task actions instead of direct TaskRunner access

export async function GET() {
  try {
    // Use the optimized task action with caching and timeout
    const result = await getTasksAction();
    
    if (result.success && result.tasks) {
      return NextResponse.json({ 
        success: true,
        tasks: result.tasks,
        count: result.tasks.length 
      });
    } else {
      return NextResponse.json(
        { 
          success: false,
          error: result.error || 'Failed to fetch tasks',
          tasks: [] // Return empty array for client compatibility
        },
        { status: 200 } // Return 200 to avoid client errors during startup
      );
    }
  } catch (error) {
    console.error('Error in tasks API:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'System initializing, please try again shortly',
        tasks: [] // Return empty array for client compatibility
      },
      { status: 200 } // Return 200 to avoid client errors during startup
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { problem } = body;

    if (!problem || typeof problem !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Problem statement is required' },
        { status: 400 }
      );
    }

    // Use the optimized createTaskAction
    const { createTaskAction } = await import('@/lib/actions/task-actions');
    const result = await createTaskAction(problem.trim());

    if (result.success) {
      return NextResponse.json({
        success: true,
        taskId: result.taskId,
        message: 'Task creation initiated'
      });
    } else {
      return NextResponse.json(
        { success: false, error: result.error || 'Failed to create task' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error creating task:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create task', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
