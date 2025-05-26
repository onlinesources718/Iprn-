// API configuration
const API_KEY = '6wipQhnbSnG72xXqx7xlcQ';
const API_URL = 'https://api.premiumy.net/v1.0';

// Initialize the application
$(document).ready(function() {
    // Set default dates (last 7 days)
    setDefaultDates();
    
    // Handle form submission
    $('#reportFilter').on('submit', function(e) {
        e.preventDefault();
        fetchAndDisplayReports();
    });
    
    // Handle export button click
    $('#exportCsv').on('click', exportToCsv);
    
    // Initial data load
    fetchAndDisplayReports();
});

// Set default dates (last 7 days)
function setDefaultDates() {
    const now = new Date();
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(now.getDate() - 7);
    
    $('#startDate').val(formatDateForInput(sevenDaysAgo));
    $('#endDate').val(formatDateForInput(now));
}

function formatDateForInput(date) {
    return date.toISOString().slice(0, 16);
}

// Format API date to readable format
function formatDate(dateString) {
    if (!dateString) return '-';
    
    const options = { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric', 
        hour: '2-digit', 
        minute: '2-digit' 
    };
    return new Date(dateString).toLocaleDateString('en-US', options);
}

// Get status badge HTML
function getStatusBadge(status) {
    if (!status) return '<span class="badge bg-secondary">Unknown</span>';
    
    status = status.toLowerCase();
    if (status.includes('deliver')) {
        return '<span class="badge bg-success">Delivered</span>';
    } else if (status.includes('fail')) {
        return '<span class="badge bg-danger">Failed</span>';
    } else {
        return '<span class="badge bg-warning text-dark">Pending</span>';
    }
}

// Fetch SMS reports from API and display them
async function fetchAndDisplayReports() {
    const startDate = $('#startDate').val();
    const endDate = $('#endDate').val();
    const senderId = $('#senderId').val();
    const phoneNumber = $('#phoneNumber').val();

    if (!startDate || !endDate) {
        alert('Please select both start and end dates');
        return;
    }

    showLoading(true);
    
    try {
        const reports = await fetchSmsReports({
            startDate: new Date(startDate).toISOString(),
            endDate: new Date(endDate).toISOString(),
            senderId,
            phoneNumber
        });

        displayReports(reports);
        updateSummaryCards(reports);
    } catch (error) {
        console.error('Error:', error);
        alert('Failed to fetch reports. Please check console for details.');
    } finally {
        showLoading(false);
    }
}

// Fetch SMS reports from API
async function fetchSmsReports(params) {
    const response = await fetch(`${API_URL}/csv`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Api-Key': API_KEY
        },
        body: JSON.stringify({
            jsonrpc: "2.0",
            method: "sms.mdr_full:get_list",
            params: {
                filter: {
                    start_date: params.startDate,
                    end_date: params.endDate,
                    senderid: params.senderId || undefined,
                    phone: params.phoneNumber || undefined
                },
                page: 1,
                per_page: 1000
            },
            id: null
        })
    });

    if (!response.ok) {
        throw new Error(`API request failed with status ${response.status}`);
    }

    const data = await response.json();
    return data.result || [];
}

// Display reports in the table
function displayReports(reports) {
    const $tableBody = $('#reportData');
    $tableBody.empty();
    
    if (reports.length === 0) {
        $tableBody.append(`
            <tr>
                <td colspan="6" class="text-center">No data available for the selected filters</td>
            </tr>
        `);
        return;
    }

    reports.forEach(report => {
        $tableBody.append(`
            <tr>
                <td>${formatDate(report.datetime)}</td>
                <td>${report.senderid || '-'}</td>
                <td>${report.phone || '-'}</td>
                <td>${getStatusBadge(report.status)}</td>
                <td>${report.cost ? `$${parseFloat(report.cost).toFixed(2)}` : '-'}</td>
                <td>
                    <button class="btn btn-sm btn-outline-primary view-message" 
                            data-message="${report.message || 'No message content available'}"
                            data-sender="${report.senderid || 'Unknown'}"
                            data-phone="${report.phone || 'Unknown'}">
                        <i class="fas fa-eye"></i> View
                    </button>
                </td>
            </tr>
        `);
    });
    
    // Add click handler for view message buttons
    $('.view-message').on('click', function() {
        const message = $(this).data('message');
        const sender = $(this).data('sender');
        const phone = $(this).data('phone');
        
        $('#messageDetails').html(`
            <div class="mb-3">
                <strong>Sender ID:</strong> ${sender}
            </div>
            <div class="mb-3">
                <strong>Phone:</strong> ${phone}
            </div>
            <div class="mb-3">
                <strong>Message:</strong>
                <div class="p-3 bg-light rounded mt-2">${message}</div>
            </div>
        `);
        
        new bootstrap.Modal(document.getElementById('messageModal')).show();
    });
}

// Update summary cards
function updateSummaryCards(reports) {
    const totalMessages = reports.length;
    const deliveredMessages = reports.filter(r => 
        r.status && r.status.toLowerCase().includes('deliver')).length;
    const totalCost = reports.reduce((sum, report) => 
        sum + (report.cost ? parseFloat(report.cost) : 0), 0);
    
    $('#totalMessages').text(totalMessages);
    $('#deliveredMessages').text(deliveredMessages);
    $('#totalCost').text(`$${totalCost.toFixed(2)}`);
}

// Export to CSV
async function exportToCsv() {
    const startDate = $('#startDate').val();
    const endDate = $('#endDate').val();
    const senderId = $('#senderId').val();
    const phoneNumber = $('#phoneNumber').val();

    if (!startDate || !endDate) {
        alert('Please select both start and end dates');
        return;
    }

    showLoading(true);
    
    try {
        const response = await fetch(`${API_URL}/csv`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Api-Key': API_KEY
            },
            body: JSON.stringify({
                jsonrpc: "2.0",
                method: "sms.mdr_full:get_list",
                params: {
                    filter: {
                        start_date: new Date(startDate).toISOString(),
                        end_date: new Date(endDate).toISOString(),
                        senderid: senderId || undefined,
                        phone: phoneNumber || undefined
                    },
                    page: 1,
                    per_page: 10000
                },
                id: null
            })
        });

        if (!response.ok) {
            throw new Error(`API request failed with status ${response.status}`);
        }

        const csvData = await response.text();
        const blob = new Blob([csvData], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `sms_report_${startDate}_to_${endDate}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    } catch (error) {
        console.error('Error exporting to CSV:', error);
        alert('Failed to export to CSV. Please check console for details.');
    } finally {
        showLoading(false);
    }
}

// Show/hide loading indicator
function showLoading(show) {
    $('#loadingIndicator').toggle(show);
}