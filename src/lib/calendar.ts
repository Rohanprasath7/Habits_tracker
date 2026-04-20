export async function syncToGoogleCalendar(task: { title: string; description?: string; dueDate: string }, accessToken: string) {
  try {
    const response = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        summary: task.title,
        description: task.description,
        start: {
          dateTime: task.dueDate,
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        },
        end: {
          dateTime: new Date(new Date(task.dueDate).getTime() + 3600000).toISOString(), // +1 hour
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        },
        reminders: {
          useDefault: true,
        },
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const message = errorData.error?.message || response.statusText || `Status ${response.status}`;
      throw new Error(`Calendar API error: ${message}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Failed to sync to Google Calendar:', error);
    throw error;
  }
}

export async function listGoogleCalendarEvents(accessToken: string, timeMin: string, timeMax: string) {
  try {
    const url = new URL('https://www.googleapis.com/calendar/v3/calendars/primary/events');
    url.searchParams.append('timeMin', timeMin);
    url.searchParams.append('timeMax', timeMax);
    url.searchParams.append('singleEvents', 'true');
    url.searchParams.append('orderBy', 'startTime');

    const response = await fetch(url.toString(), {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const message = errorData.error?.message || response.statusText || `Status ${response.status}`;
      throw new Error(`Calendar API error: ${message}`);
    }

    const data = await response.json();
    return data.items || [];
  } catch (error) {
    console.error('Failed to list Google Calendar events:', error);
    throw error;
  }
}
