/**
 * Planner Export API
 * REST endpoint for exporting planner data
 * @module api/planner/export
 */

import { NextRequest, NextResponse } from 'next/server'
import { exportPlannerData, type ExportFormat, type ExportOptions } from '@/lib/planner/exportService'

// ============================================================================
// GET /api/planner/export
// ============================================================================

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)

    // Parse query parameters
    const format = (searchParams.get('format') || 'json') as ExportFormat
    const from = searchParams.get('from')
    const to = searchParams.get('to')
    const types = searchParams.get('types')?.split(',').filter(Boolean) as ExportOptions['types']
    const status = searchParams.get('status')?.split(',').filter(Boolean) as ExportOptions['status']
    const includeArchived = searchParams.get('includeArchived') === 'true'

    // Validate format
    if (!['json', 'ical', 'csv'].includes(format)) {
      return NextResponse.json(
        { error: 'Invalid format. Supported formats: json, ical, csv' },
        { status: 400 }
      )
    }

    // Build options
    const options: ExportOptions = {
      format,
      includeArchived,
    }

    if (from || to) {
      options.dateRange = {
        from: from ? new Date(from) : new Date(0),
        to: to ? new Date(to) : new Date(),
      }
    }

    if (types && types.length > 0) {
      options.types = types
    }

    if (status && status.length > 0) {
      options.status = status
    }

    // Export data
    const data = await exportPlannerData(options)

    // Set appropriate headers based on format
    const contentTypes: Record<ExportFormat, string> = {
      json: 'application/json',
      ical: 'text/calendar',
      csv: 'text/csv',
    }

    const extensions: Record<ExportFormat, string> = {
      json: 'json',
      ical: 'ics',
      csv: 'csv',
    }

    const filename = `quarry-planner-export-${new Date().toISOString().split('T')[0]}.${extensions[format]}`

    return new NextResponse(data, {
      headers: {
        'Content-Type': contentTypes[format],
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-cache',
      },
    })
  } catch (error) {
    console.error('[API/planner/export] Export failed:', error)
    return NextResponse.json(
      { error: 'Export failed', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

// ============================================================================
// POST /api/planner/export - For complex export options
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const {
      format = 'json',
      dateRange,
      types,
      status,
      includeArchived = false,
    } = body as {
      format?: ExportFormat
      dateRange?: { from: string; to: string }
      types?: ExportOptions['types']
      status?: ExportOptions['status']
      includeArchived?: boolean
    }

    // Validate format
    if (!['json', 'ical', 'csv'].includes(format)) {
      return NextResponse.json(
        { error: 'Invalid format. Supported formats: json, ical, csv' },
        { status: 400 }
      )
    }

    // Build options
    const options: ExportOptions = {
      format,
      includeArchived,
    }

    if (dateRange) {
      options.dateRange = {
        from: new Date(dateRange.from),
        to: new Date(dateRange.to),
      }
    }

    if (types && types.length > 0) {
      options.types = types
    }

    if (status && status.length > 0) {
      options.status = status
    }

    // Export data
    const data = await exportPlannerData(options)

    // For POST, return JSON with the data embedded
    if (format === 'json') {
      return NextResponse.json({
        success: true,
        format,
        data: JSON.parse(data as string),
      })
    }

    // For other formats, return as base64 encoded
    const base64 = Buffer.from(data as string).toString('base64')
    return NextResponse.json({
      success: true,
      format,
      data: base64,
      encoding: 'base64',
    })
  } catch (error) {
    console.error('[API/planner/export] Export failed:', error)
    return NextResponse.json(
      { error: 'Export failed', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
