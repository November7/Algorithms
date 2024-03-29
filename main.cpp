#include <iostream>
#include <time.h>
#include "printArray.h"
#include "randomArray.h"

using namespace std;

int main()
{
    int r = 10;
    int *p = new int[r];


    randomArray(p,r,0,20,true,true);
    printArray(p,r);
    

    delete [] p;
}