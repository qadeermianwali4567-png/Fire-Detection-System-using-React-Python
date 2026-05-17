import cv2

print('Checking available cameras...')
for i in range(1):
    cap = cv2.VideoCapture(i)
    if cap.isOpened():
        ret, frame = cap.read()
        print(f'Camera {i}: Available')
        cap.release()
    else:
        print(f'Camera {i}: Not found')

print('Done!')