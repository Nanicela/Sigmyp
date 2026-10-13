export const BUSINESS_TIME_ZONE='America/Bogota';

export function businessYear(date=new Date()){
  const value=date instanceof Date?date:new Date(date);
  if(Number.isNaN(value.getTime()))throw new Error('La fecha del periodo no es válida.');
  return Number(new Intl.DateTimeFormat('en-US',{timeZone:BUSINESS_TIME_ZONE,year:'numeric'}).format(value));
}

export function businessYearBounds(year=businessYear()){
  const value=Number(year);
  if(!Number.isInteger(value)||value<2000||value>9998)throw new Error('El año operativo no es válido.');
  return {
    year:value,
    start:new Date(`${value}-01-01T00:00:00-05:00`),
    end:new Date(`${value+1}-01-01T00:00:00-05:00`)
  };
}

export function isCurrentBusinessYear(date,now=new Date()){
  return businessYear(date)===businessYear(now);
}
