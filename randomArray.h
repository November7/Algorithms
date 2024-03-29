#pragma once
#ifndef __RANDOMARRAY20240329_H__
#define __RANDOMARRAY20240329_H__

#include <iostream>
using namespace std;


int randomArray(int t[], int n, int min, int max, int unique=false, int sorted=false)
{
    srand(time(NULL));
    if(min > max) swap(min, max);
    
    if (unique)
    {
        
        if(max - min + 1 <= n) return -1;
        int spread = 1 + (max - min + 1) / n;

        t[0] = min + rand() % spread;        
        for(int i = 1; i < n; i++)
        {
            spread = 1+(max - t[i-1] - n + i)/(n-i);
            if(spread > 1)
            {
                t[i] = t[i-1] + rand() % spread + 1;
            }
            else
            {
                t[i] = t[i-1] + 1;
            }            
        }
        if(!sorted) 
        {
            for(int i = 0; i < n; i++)
            {
                int j = rand() % n;
                swap(t[i], t[j]);
            }
        }
    }
    else
    {
        int spread = max - min + 1;
        for (int i = 0; i < n; i++)
        {
            t[i] = rand() % spread + min;
        }
    }
    return 0;
}


#endif // __RANDOMARRAY20240329_H__