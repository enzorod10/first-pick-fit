import React, { useEffect, useState } from 'react';
import { Typewriter } from 'react-simple-typewriter'
import styles from './UserPrompt.module.css';
import { userSlice } from '../../redux/features/user/userSlice';
import { calendarSlice } from '../../redux/features/calendar/calendarSlice';
import { useSelector } from "react-redux";
import { RootState } from '../../store';
import { useGetUserNextWorkoutQuery, useGetClickedOnDateQuery, useDeleteUserWorkoutFromMonthWorkoutsMutation } from '../../redux/features/calendar/calendarApi';
import { DateTime } from 'luxon';
import AllocatedExercise from '../../interfaces/AllocatedExercise';
import Workout from '../../interfaces/Workout';
import Image from 'next/image';

const UserPrompt = () => {
    const { userId } = useSelector((state: RootState) => state[userSlice.name])
    const { monthAndYear, monthSelected, spacedMonthAndYear, dateClicked } = useSelector((state: RootState) => state[calendarSlice.name])
    const [skip, setSkip] = useState<boolean[]>([false, true])
    const { data, error, isSuccess, isFetching, refetch } = useGetUserNextWorkoutQuery({ userId, monthAndYear, currentDate: DateTime.now().day, currentMonth: DateTime.now().month, monthSelected, currentYear: DateTime.now().year }, { skip: skip[0]})
    const [deleteUserWorkoutFromMonthWorkouts] = useDeleteUserWorkoutFromMonthWorkoutsMutation();
    const [secondRender, setSecondRender] = useState(false)
    const [thirdRender, setThirdRender] = useState(false)
    const clickedOnDateResult = useGetClickedOnDateQuery({ userId, monthAndYear, dateClicked }, { skip: skip[1] })

    useEffect(() => {
        monthAndYear !== '' && setSkip((prevskip) => [prevskip[0] = false, prevskip[1] = true])
    }, [monthAndYear])

    useEffect(() => {
        dateClicked && setSkip((prevskip) => [prevskip[0] = true, prevskip[1] = false])
    }, [dateClicked])

    useEffect(() => {
        skip[1] && setThirdRender(false) 
        skip[0] && setSecondRender(false)
    }, [skip])

    useEffect(() => {
        !thirdRender && setSecondRender(true)
        !secondRender && setThirdRender(true)
    }, [secondRender, thirdRender])

    const removeFromCalendar = () => {
        if (clickedOnDateResult.data){
            deleteUserWorkoutFromMonthWorkouts({ userId, monthAndYear, date: clickedOnDateResult?.data?.date});
            setSkip((prevskip) => [prevskip[0] = false, prevskip[1] = true])
        }
        if (data){
            deleteUserWorkoutFromMonthWorkouts({ userId, monthAndYear, date: data?.date  });
            refetch();
        }
    }

    const UserHasUpcomingWorkoutRender: any = () => {
        return(
            <div style={{display: 'flex', flexDirection: 'column'}}>
                <div>
                    The next workout you have planned for the month you are viewing is on <span style={{ color: 'var(--charcoal)', fontWeight: 'bold' }}>{spacedMonthAndYear.split(' ')[0]} {data.date} </span> {' '} 
                    and it is called {' '} <span style={{ color: 'var(--charcoal)', fontWeight: 'bold' }}>{data.workout.name}.</span> {' '}
                    Here is more information:
                </div>
                <WorkoutExerciseRenderedOnDashboard workout={data.workout}/>
            </div>)
    }

    const WorkoutExerciseRenderedOnDashboard = ( { workout }: {workout: Workout}) => {
        return(
            <div className={styles.workoutContainer}>
                <h3 style={{fontSize: '0.9rem', color: 'var(--oxford-blue)',}}>
                    Muscles Targeted
                </h3>
                <ul className={styles.areasTargeted}>
                    {workout.areasTargeted.map((area, index) => {
                        return (index < 2 &&
                            <li key={area.id}>
                                <Image src={`/images/muscle-parts/${area.name}.png`} alt={`${area.name}`} width='30' height='30' />
                                <p>{area.name}</p>
                            </li>)
                    })}
                </ul>
                <h3 style={{fontSize: '0.9rem', color: 'var(--oxford-blue)'}}>
                    Exercises
                </h3>
                {workout.exercises.map((exercise: AllocatedExercise, index: number) => {
                    return (<div style={{paddingLeft: '0.5rem', fontSize: '0.8rem'}}key={exercise.id}> 
                                <span className={styles.workoutExerciseName} style={{ color: 'var(--charcoal)', fontWeight: 'bold' }}>
                                {index + 1}. {' '}<Typewriter
                                    words={[`${exercise.name}`]}
                                    loop={1}
                                    cursor
                                    cursorStyle=''
                                    typeSpeed={100}
                                    deleteSpeed={50}
                                    delaySpeed={2000}/>
                                </span>
                                <ul style={{paddingLeft: '1rem', paddingTop: '0.2rem'}}>
                                    {exercise.sets.map(setBlock => {
                                        return(
                                            <li key={setBlock.id}>
                                                <span style={{ color: 'var(--charcoal)', alignItems: 'center', minWidth: 'max-content', display: 'flex', gap: '3px', fontSize: '0.8rem' }}>
                                                    <span> {setBlock.sets} </span>
                                                    <span> x </span>
                                                    <span>{setBlock.reps}</span>
                                                    {setBlock.weight > 0 && <span> @ </span>}
                                                    {setBlock.weight > 0 && <span>{setBlock.weight} lbs </span>}
                                                </span>
                                            </li>
                                        )
                                    })}
                                </ul>
                            </div>
                )})}
                <h3 style={{fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--oxford-blue)'}}>
                    <span>
                        Remove From Calendar? 
                    </span>
                    <Image onClick={removeFromCalendar} src='/images/icons/remove.png' alt='removeIcon' width='15' height='15'/>
                </h3>
            </div>)
    }
    
    const ClickedOnWorkoutInformationRender = () => {
        return(
            <div style={{display: 'flex', flexDirection: 'column', gap: '0.5rem'}}>
                <span>
                    You clicked on{' '}
                    <span style={{ color: 'var(--charcoal)', fontWeight: 'bold' }}>
                        <Typewriter
                            words={[`${spacedMonthAndYear.split(' ')[0]} ${clickedOnDateResult.data.date}, ${spacedMonthAndYear.split(' ')[1]}. `]}
                            loop={1}
                            cursor
                            cursorStyle=' '
                            typeSpeed={100}
                            deleteSpeed={50}
                            delaySpeed={2000}/>
                    </span>
                    The workout for this day is called{' '}
                    <span style={{ color: 'var(--charcoal)', fontWeight: 'bold' }}>
                        <Typewriter
                            words={[`${clickedOnDateResult.data.workout.name}. `]}
                            loop={1}
                            cursor
                            cursorStyle=' '
                            typeSpeed={100}
                            deleteSpeed={50}
                            delaySpeed={2000}/>
                    </span>
                    Here is more information on it:
                </span>
                
                <WorkoutExerciseRenderedOnDashboard workout={clickedOnDateResult.data.workout} />
            </div>
        )
    } 

    const SecondMessageRender: any = () => {
        if (isSuccess && !isFetching) return UserHasUpcomingWorkoutRender()
        if (error === 'No upcoming workout for this month'){
            return <div>
            Currently viewing <span style={{ color: 'var(--charcoal)', fontWeight: 'bold' }}>{spacedMonthAndYear}</span> {' '}
            It looks like you don&apos;t have any upcoming workouts 
            for this month. You can drag workouts directly into a date
            to schedule a workout for that date.
        </div>
        }
        if (error === 'Older date'){
            return <div>
            Currently viewing <span style={{ color: 'var(--charcoal)', fontWeight: 'bold' }}>{spacedMonthAndYear}</span>.
            It looks like this is from a previous month which has already passed. 
            You can drag workouts directly into a date to schedule a workout for that date.
        </div>
        }
    }

    const ThirdMessageRender: any = () => {
        if (clickedOnDateResult.isSuccess && !clickedOnDateResult.isFetching) return <ClickedOnWorkoutInformationRender />
        if (clickedOnDateResult.error && clickedOnDateResult.error !== 'UserId Error') return( 
            <div>
                There&apos;s no workout scheduled for <span style={{color: 'var(--charcoal)', fontWeight: 'bold'}}>{spacedMonthAndYear.split(' ')[0]} {clickedOnDateResult.originalArgs?.dateClicked}.</span>
            </div>)
    }

    return (
        <div className={styles.container}>
            { skip[1] && <div>Today is
                <span style={{ color: 'var(--charcoal)', fontWeight: 'bold' }}>
                    <Typewriter
                    words={[` ${DateTime.now().toFormat('MMMM d, yyyy')}. `]}
                    loop={1}
                    cursor
                    cursorStyle=' '
                    typeSpeed={100}
                    deleteSpeed={50}
                    delaySpeed={1000}
                    />
                </span>
                Click on any date on the calendar to get information about a workout
                scheduled for that day. 
            </div>}
            { secondRender && SecondMessageRender() }
            { thirdRender && ThirdMessageRender() }
        </div>
    )
};

export default UserPrompt;