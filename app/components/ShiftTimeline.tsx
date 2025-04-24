import type React from "react";
import { type Shift, type Role, type Staff, ShiftStatus } from "../types";
import { format } from "date-fns";

interface ShiftTimelineProps {
  shifts: Shift[];
  roles: Role[];
  staffs: Staff[];
  timeUnitMinutes: number;
  startTime: Date;
  endTime: Date;
}

const ShiftTimeline: React.FC<ShiftTimelineProps> = ({
  shifts,
  roles,
  staffs,
  timeUnitMinutes,
  startTime,
  endTime,
}) => {
  const timeSlots = [];
  let currentTime = new Date(startTime);
  while (currentTime < endTime) {
    timeSlots.push(new Date(currentTime));
    currentTime.setMinutes(currentTime.getMinutes() + timeUnitMinutes);
  }

  return (
    <div>
      <h2>Shift Timeline</h2>
      {/* タイムラインの描画 */}
      <div>
        {timeSlots.map((time) => (
          <span key={time.toISOString()}>{format(time, "HH:mm")}</span>
        ))}
      </div>
      <div>
        {shifts.map((shift) => {
          const role = roles.find((r) => r.id === shift.roleId);
          const staff = staffs.find((s) => s.id === shift.staffId);
          const shiftStyle = {
            backgroundColor: role?.color,
            border:
              shift.status === ShiftStatus.draft ? "2px dashed gray" : "none", // Add this line
          };
          return (
            <div key={shift.id} style={shiftStyle}>
              {staff?.name} - {role?.name} -{" "}
              {format(shift.timeRange.start, "HH:mm")} -{" "}
              {format(shift.timeRange.end, "HH:mm")}
              {shift.isPreferredRole ? "(希望)" : "(希望外)"}
              {shift.status === ShiftStatus.draft ? "(下書き)" : ""}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ShiftTimeline;
