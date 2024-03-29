import { createApi, fakeBaseQuery } from '@reduxjs/toolkit/query/react';
import { collection, doc, getDocs, getDoc, setDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { DateTime, Duration } from 'luxon';
import { db } from '../../../firebase/clientApp';
import Program from '../../../interfaces/Program';
import Workout from '../../../interfaces/Workout';

export const calendarApi = createApi({
    reducerPath: 'calendarApi',
    baseQuery: fakeBaseQuery(),
    tagTypes: ['Month', 'Day'], 
    endpoints: (builder) => ({
        getUserMonthWorkouts: builder.query<{ [key: number]: { date: number, workout: Workout } }, { userId: string | undefined, monthAndYear: string, arrayOfMonth: number[] | undefined}>({
            async queryFn( { userId, monthAndYear, arrayOfMonth }){
                if (userId){
                    const snapshot = await getDocs(collection(db, `user/${userId}/${monthAndYear}`))
                    const initialData = snapshot.docs.map(snap => {
                        return snap.data()
                    })

                    const data = initialData.reduce((a, v) => ({ ...a, [v.date]: v }), {})

                    return { data }
                } else return { error: 'Error' }
            },
            providesTags: (result, error, { arrayOfMonth, monthAndYear }):any => result ?  [...Object.values(result).map( ({ date }) => ({ type: 'Day' as const, id: date })), {type: 'Month', id: monthAndYear.split('_')[0]}] : ['Month']
        }),
        getUserNextWorkout: builder.query<any, { userId: string | undefined, monthAndYear: string, currentDate: number, currentMonth: number, monthSelected: number | null, currentYear: number }>({
            async queryFn( { userId, monthAndYear, currentDate, currentMonth, monthSelected, currentYear }){
                if (userId && monthAndYear){
                    const snapshot = await getDocs(collection(db, `user/${userId}/${monthAndYear}`))

                    let data: any;
                    let olderDate: boolean = false

                    if ((Number(monthAndYear.split('_')[1])  > currentYear) || ((Number(monthAndYear.split('_')[1]) === currentYear) && (Number(monthSelected) > currentMonth))){
                        let orderedWorkouts = snapshot.docs.sort((a, b) => a.data().date - b.data().date)
                        data = orderedWorkouts[0]
                    } if ((Number(monthAndYear.split('_')[1])  < currentYear) || ((Number(monthAndYear.split('_')[1]) === currentYear) && (Number(monthSelected) < currentMonth))){
                        olderDate = true;
                    } if ((Number(monthAndYear.split('_')[1]) === currentYear) && (Number(monthSelected) === currentMonth)){
                        let orderedWorkouts = snapshot.docs.sort((a, b) => a.data().date - b.data().date)
                        data = orderedWorkouts.find(workout => workout.data().date >= currentDate)
                    }

                    if (olderDate){
                        return { error: 'Older date'}
                    }
                    if (!data){
                        return { error: 'No upcoming workout for this month' }
                    }
                    if(snapshot.docs.length === 0){
                        return { error: 'No Dates'}
                    }
                    return { data: data.data() }
                } else return { error: 'UserId Error' }
            },
            providesTags: (result, err, { monthAndYear }) => [{ type: 'Month', id: monthAndYear.split('_')[0] }]
        }),
        getClickedOnDate: builder.query<any, { userId: string | undefined, monthAndYear: string, dateClicked: number | null }>({
            async queryFn( { userId, monthAndYear, dateClicked }){
                if (userId){
                    const snapshot = await getDocs(collection(db, `user/${userId}/${monthAndYear}`))
                    const data = snapshot.docs.find(snap => {
                        return snap.data().date === dateClicked 
                    })
                    
                    if (!data) return { error: 'Clicked date has no workout' }

                    return { data: data.data() }
                } else return { error: 'UserId Error' }
            },
            providesTags: (result, err, { monthAndYear, dateClicked }): any => [{ type: 'Month' as const, id: monthAndYear.split('_')[0] }, { type: 'Day' as const, id: dateClicked}]
        }),
       
        deleteUserWorkoutFromMonthWorkouts: builder.mutation<null,  { userId: string | undefined, monthAndYear: string, date: number }>({
            async queryFn({ userId, monthAndYear, date }){
                if (userId){
                    await deleteDoc(doc(db, 'user', userId, monthAndYear, `${date}`))
                    return { data: null }
                } else return { error: 'Error'}
            },
            invalidatesTags: (result, error, { date, monthAndYear }) => {
                return [{ type: 'Day', id: date }, { type: 'Month', id: monthAndYear.split('_')[0]} ]
            }
        }),
        changeUserWorkoutCompleteStatus: builder.mutation<null,  { userId: string | undefined, monthAndYear: string, date: number }>({
            async queryFn({ userId, monthAndYear, date }){
                if (userId){
                    const docRef = await getDoc(doc(db, 'user', userId, monthAndYear, `${date}`))
                    await updateDoc(docRef.ref, { workout: {...docRef.data()?.workout, complete: docRef.data()?.workout.complete ? false : true }})
                    return { data: null }
                } else return { error: 'Error'}
            },
            invalidatesTags: (result, error, { date, monthAndYear }) => {
                return [{ type: 'Day', id: date }, { type: 'Month', id: monthAndYear.split('_')[0]} ]
            }
        }),
        addUserWorkoutToMonthWorkouts: builder.mutation<null,  { userId: string | undefined, monthAndYear: string, date: number, workout: Workout }>({
            async queryFn({ userId, monthAndYear, date, workout }){
                if (userId){
                    await setDoc(doc(db, 'user', userId, monthAndYear, `${date}`), { date, workout })
                    return { data: null }
                } else return { error: 'Error'}
            },
            invalidatesTags: (result, error, { monthAndYear, date }) => {
                return [{ type: 'Day', id: date }, { type: 'Month', id: monthAndYear.split('_')[0]} ]
            }
        }),
        addProgramToCalendar: builder.mutation<{ type: 'Month' | 'Day', id: string | number }[],  { userId: string | undefined, startDate: string, program: Program }>({
            async queryFn({ userId, program, startDate }){
                let dateArray: { type: 'Month' | 'Day', id: string | number }[] = [];
                if (userId){
                    for (let i=0; i<program.duration; i++){
                        for (let q=0; q<7; q++){
                            if (program.shape[q] === null){
                                continue;
                            } else{
                                let dateToUse = DateTime.fromFormat(startDate, 'MMMM d, yyyy').plus(Duration.fromObject({ days: (i*7) + q }));
                                dateArray.push({ type: 'Month', id: dateToUse.toFormat('MMMM').toLowerCase()}, { type: 'Day', id: Number(dateToUse.toFormat('d'))})
                                await setDoc(doc(db, 'user', userId, dateToUse.toFormat('MMMM_yyyy').toLocaleLowerCase(), dateToUse.toFormat('d')), { date: Number(dateToUse.toFormat('d')), workout: program.workouts[program.shape[q]!] })
                            }
                        }
                    }
                    return { data: dateArray }
                } else return { error: 'Error'}
            },
            invalidatesTags: (result, error) => result ? result : []
        }),
    })
})

export const { useGetUserMonthWorkoutsQuery, useAddUserWorkoutToMonthWorkoutsMutation, useDeleteUserWorkoutFromMonthWorkoutsMutation, useGetUserNextWorkoutQuery, useGetClickedOnDateQuery, useChangeUserWorkoutCompleteStatusMutation, useAddProgramToCalendarMutation  } = calendarApi; 