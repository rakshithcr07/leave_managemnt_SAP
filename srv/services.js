const cds = require('@sap/cds')

module.exports = cds.service.impl(function () {
  const { Employees, LeaveRequests, LeaveBalances } = this.entities

  const _currentUserId = (req) => req.user && (req.user.id || req.user.sub)

  const _getCurrentEmployee = async (tx, req) => {
    const userId = _currentUserId(req)
    if (!userId) req.reject(401, 'Unauthenticated')

    const employee = await tx.run(SELECT.one.from(Employees).where({ email: userId }))
    if (!employee) req.reject(404, `No employee found for user ${userId}`)
    return employee
  }

  this.before('CREATE', LeaveRequests, async (req) => {
    const tx = cds.transaction(req)
    const employee = await _getCurrentEmployee(tx, req)

    req.data.employee_ID = employee.ID

    if (!employee.manager_ID) req.reject(400, 'No manager assigned to employee')
    req.data.manager_ID = employee.manager_ID

    if (!req.data.status) req.data.status = 'Pending'
    if (req.data.status !== 'Pending') req.reject(400, 'New leave request status must be Pending')
  })

  this.before('UPDATE', LeaveRequests, async (req) => {
    const tx = cds.transaction(req)
    const employee = await _getCurrentEmployee(tx, req)

    const id = req.data.ID || (req.params && req.params[0] && req.params[0].ID)
    if (!id) req.reject(400, 'Missing leave request ID')

    const existing = await tx.run(
      SELECT.one.from(LeaveRequests).columns('employee_ID', 'manager_ID', 'status').where({ ID: id })
    )
    if (!existing) req.reject(404, 'Leave request not found')

    if (req.data.employee || req.data.employee_ID) req.reject(400, 'employee cannot be changed')
    if (req.data.manager || req.data.manager_ID) req.reject(400, 'manager cannot be changed')

    if (req.data.status) {
      const newStatus = req.data.status
      const oldStatus = existing.status

      if (oldStatus !== 'Pending') req.reject(400, 'Only Pending requests can be updated')

      if (newStatus === 'Approved' || newStatus === 'Rejected') {
        if (employee.ID !== existing.manager_ID) req.reject(403, 'Only the manager can approve/reject')
        req.data.decisionAt = new Date().toISOString()
      } else if (newStatus === 'Cancelled') {
        if (employee.ID !== existing.employee_ID) req.reject(403, 'Only the employee can cancel')
      } else if (newStatus === 'Pending') {
        req.reject(400, 'Status is already Pending')
      } else {
        req.reject(400, 'Invalid status')
      }
    }
  })

  this.after('UPDATE', LeaveRequests, async (data, req) => {
    if (!data || !data.ID) return
    if (data.status !== 'Approved') return

    const tx = cds.transaction(req)

    const approved = await tx.run(
      SELECT.one.from(LeaveRequests).columns('employee_ID', 'leaveType_ID', 'startDate', 'days', 'status').where({ ID: data.ID })
    )
    if (!approved || approved.status !== 'Approved') return

    const year = approved.startDate ? new Date(approved.startDate).getFullYear() : new Date().getFullYear()

    const updated = await tx.run(
      UPDATE(LeaveBalances)
        .set({ used: { '+=': approved.days || 0 } })
        .where({ employee_ID: approved.employee_ID, leaveType_ID: approved.leaveType_ID, year })
    )

    if (!updated || updated === 0) {
      req.reject(400, 'No leave balance found for employee/type/year')
    }
  })

  this.before('DELETE', LeaveRequests, async (req) => {
    const tx = cds.transaction(req)
    const employee = await _getCurrentEmployee(tx, req)

    const id = req.data.ID || (req.params && req.params[0] && req.params[0].ID)
    if (!id) req.reject(400, 'Missing leave request ID')

    const existing = await tx.run(
      SELECT.one.from(LeaveRequests).columns('employee_ID', 'status').where({ ID: id })
    )
    if (!existing) req.reject(404, 'Leave request not found')

    if (existing.employee_ID !== employee.ID) req.reject(403, 'Only the employee can delete the request')
    if (existing.status !== 'Pending') req.reject(400, 'Only Pending requests can be deleted')
  })
})
