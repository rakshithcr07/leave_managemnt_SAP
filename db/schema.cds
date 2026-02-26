namespace leave.management;

using { cuid, managed } from '@sap/cds/common';

/**
 * Employee master data
 */
entity Employees : cuid, managed {
  employeeId : String(20) @mandatory;
  name       : String(100);
  email      : String(100);
  role       : String(20);        // EMPLOYEE | MANAGER
  managerId  : String(20);
}

/**
 * Leave requests
 */
entity LeaveRequests : cuid, managed {
  employee     : Association to Employees;
  leaveType    : String(30);      // Casual | Sick | Earned
  startDate    : Date;
  endDate      : Date;
  reason       : String(255);
  status       : String(20) default 'PENDING'; // PENDING | APPROVED | REJECTED
  managerNote : String(255);
}