using { leave.management as lm } from '../db/schema';

service LeaveService {

  @readonly
  entity Employees as projection on lm.Employees;

  entity LeaveRequests as projection on lm.LeaveRequests;

  action approveLeave(leaveId : UUID, note : String);
  action rejectLeave(leaveId : UUID, note : String);
}