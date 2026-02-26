const cds = require('@sap/cds');

module.exports = async function (srv) {

  const { LeaveRequests } = srv.entities;

  // Approve leave
  srv.on('approveLeave', async (req) => {
    const { leaveId, note } = req.data;

    const updated = await UPDATE(LeaveRequests)
      .set({
        status: 'APPROVED',
        managerNote: note
      })
      .where({ ID: leaveId });

    if (updated === 0) {
      return req.error(404, 'Leave request not found');
    }

    return { message: 'Leave approved successfully' };
  });

  // Reject leave
  srv.on('rejectLeave', async (req) => {
    const { leaveId, note } = req.data;

    const updated = await UPDATE(LeaveRequests)
      .set({
        status: 'REJECTED',
        managerNote: note
      })
      .where({ ID: leaveId });

    if (updated === 0) {
      return req.error(404, 'Leave request not found');
    }

    return { message: 'Leave rejected successfully' };
  });

};