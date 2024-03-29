#pragma once
#ifndef __PRINTARRAY20240329_H__
#define __PRINTARRAY20240329_H__

#include <iostream>
using namespace std;

void printArray(int t[], int n)
{
    for (int i = 0; i < n; i++)
    {
        cout << t[i] <<", ";
    }
    cout << endl;
}


#endif // __PRINTARRAY20240329_H__