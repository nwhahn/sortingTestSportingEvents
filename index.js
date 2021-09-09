const fs = require('fs');
const input = fs.readFileSync('input.json', { encoding: 'utf8'});

const { data: { sporting_events = {}, slate_events = {}}, status } = JSON.parse(input);

if(status!== 'ok') throw new Error('Input not ok');

const sportingEvents = Object.values(sporting_events).map((e) => ({...e, isSlate: false}));
const slateEvents = Object.values(slate_events).map((e) => ({...e, isSlate: true}));

const events = sportingEvents.concat(slateEvents);

const reducedEvents = events.reduce((prev = {}, curr) => {
  const {isSlate, date, teams, time, segmentType, segment, szTournamentDisplayName, szDescriptor } = curr;
  let [month, day, year] = date.split('/');
  const isAM = time.includes('AM');
  const [hour] = time.split(' ')[0].split(':')
  let parsedHour = 0;

  if(isAM){
    if(hour !== '12'){
      parsedHour += parseInt(hour);
    }
  } else {
    if(hour !== '12'){
        parsedHour += parseInt(hour) + 12;
    } else parsedHour = 12;
  }
  
  parsedHour -= 1;
  const limitedHour = parsedHour % 23;
  const generatedDate = new Date(year, month - 1, parsedHour > 23 ? day + 1 : day,limitedHour).toISOString();
  let valueToCommit = {
    ...curr,
    date: generatedDate,
  }
  const hintKey = `${szTournamentDisplayName}|${isSlate ? szDescriptor : teams}|${segmentType || segment}`;
  if(prev[hintKey]){
    prev[hintKey].event.push(valueToCommit);
  } else {
    prev[hintKey] = {
      event: [valueToCommit],
      date: generatedDate,
      isSlate,
      sp: curr.sp,
    }
  }

  return prev;
}, {})

const getBestOf = (szGameType) => {
  switch(szGameType){
    case 'bo3':
      return 3;
    case 'bo5':
      return 5;
    default:
      return 1;
  }
}

const generateSegmentKey = (segment) => {

  switch(segment){
    case '1st Game':
      return 'firstGame';
    case '2nd Game':
      return 'secondGame';
    case '3rd Game':
      return 'thirdGame';
    case '4th Game':
      return 'fourthGame';
    case '5th Game':
      return 'fifthGame';
    case 'First Two Games':
      return 'First2Games';
    case 'First Three Games':
      return 'First3Games';
    case 'Full Game':
    default:
      return 'fullTimeGameEvent';
  }
}
const sorted = Object.values(reducedEvents)
  .sort(({date: aDate, isSlate: aSlate, event: aEvent}, {date: bDate, isSlate: bSlate, event: bEvent }) => {


    if(aDate === bDate){
      // Put isSlate at beginning
      if(aSlate && !bSlate) return -1;
      if(bSlate && !aSlate) return 1;
      const fullGame = 'Full Game';
      const { teams: aTeam } = aEvent[0];
      const { teams: bTeam } = bEvent[0];
      

      if(aTeam !== bTeam){
        // Ensure the teams are different , and order them alphabetically
        return bTeam.localeCompare(aTeam, 'en', {sensitivity: 'base'})
      } else {
        // Put full segments first (but we ensured teams are same)
        if(aEvent[0].segment === fullGame && bEvent[0].segment !== fullGame) return -1;
        if(bEvent[0].segment === fullGame && aEvent[0].segment !== fullGame) return 1;
      }
      
    }
    const A = new Date(aDate);
    const B = new Date(bDate);
    // Just Compare dates , later after
    return A - B;
  })
  .map(({ event, isSlate, sp, date}) => {
    const isStacked = event.length > 1;
    const genDate = new Date(date);
    genDate.setHours(3);
    
    if(isSlate){
      const { szDescriptor, eGameMode, time, iGameCodeGlobalId } = event[0];

      return {
        event: {
          id: szDescriptor.toLowerCase().replace(' ', '_'),
          gameType: "18",
          date: genDate.toISOString(),
          time: `${time} ET`,
          gameID: iGameCodeGlobalId,
          sp,
          section: "featured",
          bestOf: 1,
          gameMode: eGameMode,
        },
        isSlate,
        isStacked: false,
        sp,
      }
    }
    const events = event.map(({
      time,
      iGameCodeGlobalId,
      homeTeam,
      homeTeamName,
      homeTeamCity,
      homeTeamLogoUri,
      visitingTeam,
      visitingTeamName,
      visitingTeamCity,
      visitingTeamLogoUri,
      teams,
      segment,
      szGameType,
      eGameMode,
      assoc,
      szTournamentDisplayName
    }) => ({
      id: iGameCodeGlobalId,
      gameType: '18',
      date: genDate.toISOString(),
      time: time,
      gameID: iGameCodeGlobalId,
      homeTeam,
      homeTeamName,
      homeTeamCity,
      homeTeamLogoUri,
      visitingTeam,
      visitingTeamName,
      visitingTeamCity,
      visitingTeamLogoUri,
      teams,
      sp,
      section: 'featured',
      segment,
      bestOf: getBestOf(szGameType),
      gameMode: eGameMode,
      assoc,
      tournamentDisplayName: szTournamentDisplayName,
      segmentKey: generateSegmentKey(segment),
    }));
    return  { 
      event: isStacked ? events : events[0], 
      isSlate,
      isStacked,
      sp
    };
  })


// const expected_output = fs.readFileSync('output.json', { encoding: 'utf8'});
// const expectedOutput = JSON.parse(expected_output);
fs.writeFileSync('output.json', JSON.stringify(sorted, null, 4))



